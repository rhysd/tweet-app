import Ipc from './ipc';

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default class App {
    private afterTweet: ConfigAfterTweet = 'new tweet';
    private screenName: string | null = null;

    public start(): void {
        function createCoverElement(): HTMLDivElement {
            const e = document.createElement('div');
            e.style.display = 'block';
            e.style.position = 'fixed';
            e.style.left = '0';
            e.style.top = '0';
            e.style.width = '100%';
            e.style.height = '100%';
            e.style.zIndex = '530000';
            e.style.backgroundColor = document.body.style.backgroundColor || 'white';
            return e;
        }

        function findButton(testId: string, text: string[]): HTMLElement | null {
            const button = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
            if (button !== null) {
                return button;
            }

            // XXX: TENTATIVE: detect button by aria label
            const buttons = document.querySelectorAll('[role="button"][tabIndex="0"]') as NodeList;
            for (const b of buttons) {
                const label = b.textContent;
                if (!label) {
                    continue;
                }
                if (text.includes(label)) {
                    return b as HTMLElement;
                }
            }

            console.warn('Could not find button with testid', testId, 'and text', text);
            return null; // Not found
        }

        function findTweetButton(): HTMLElement | null {
            const text = ['Tweet', 'Tweet All', 'Reply', 'Schedule', 'ツイート', 'すべてツイート', '返信', '予約設定'];
            return findButton('tweetButton', text);
        }

        function findCancelButton(): HTMLElement | null {
            return findButton('confirmationSheetCancel', ['Discard', '破棄']);
        }

        function findSaveButton(): HTMLElement | null {
            return findButton('confirmationSheetConfirm', ['Save', '保存']);
        }

        function findBackButton(): HTMLElement | null {
            const ariaLabels = ['Back', '戻る'];
            const buttons = document.querySelectorAll('[role="button"][tabIndex="0"]');
            for (const b of buttons) {
                const label = b.getAttribute('aria-label');
                if (!label) {
                    continue;
                }
                if (ariaLabels.includes(label)) {
                    return b as HTMLElement;
                }
            }
            console.warn("Could not find 'Back' button");
            return null;
        }

        Ipc.on('tweetapp:action-after-tweet', (_, action: ConfigAfterTweet | undefined) => {
            if (action) {
                console.log('Specifying action after tweet:', action);
                this.afterTweet = action;
            }
        });

        Ipc.on('tweetapp:screen-name', (_, name: string) => {
            console.log('Screen name from IPC:', name);
            this.screenName = name;
        });

        Ipc.on('tweetapp:login', _ => {
            console.log('Login detected with screen name', this.screenName);
            if (this.screenName === null) {
                return;
            }

            const screenName = this.screenName;
            let retry = 10;
            function completeScreenName(): void {
                const loginInput = document.querySelector('input[autocomplete="username"]') as HTMLInputElement | null;
                if (loginInput !== null) {
                    loginInput.focus();
                    loginInput.value = screenName;
                    return;
                }

                if (retry <= 0) {
                    console.warn('Username input in login window could not be detected after 2 seconds');
                    return;
                }

                retry--;
                window.setTimeout(completeScreenName, 200);
            }

            completeScreenName();
        });

        Ipc.on('tweetapp:sent-tweet', async (_, url: string) => {
            console.log('tweet posted. next URL:', url);
            if (this.screenName === null) {
                window.location.href = url;
                console.log('Screen name is not set. Open:', url);
                return;
            }
            document.body.appendChild(createCoverElement());
            await this.inReplyTo(url, this.screenName, 0);
        });

        Ipc.on('tweetapp:open', (_, url: string) => {
            window.location.href = url;
            console.log('Open URL due to tweetapp:open message:', url);
        });

        Ipc.on('tweetapp:click-tweet-button', _ => {
            const btn = findTweetButton();
            if (btn !== null) {
                console.log('Click tweet button', btn);
                btn.click();
            }
        });

        Ipc.on('tweetapp:cancel-tweet', _ => {
            const back = findBackButton();
            if (back === null) {
                return;
            }
            console.log('Click back button', back);
            back.click();

            function resetWindow(): void {
                document.body.appendChild(createCoverElement());
                Ipc.send('tweetapp:reset-window');
            }

            const cancel = findCancelButton();
            if (cancel !== null) {
                cancel.addEventListener('click', resetWindow, { passive: false });
            }

            const save = findSaveButton();
            if (save !== null) {
                save.addEventListener('click', resetWindow, { passive: false });
            }

            if (cancel === null && save === null) {
                console.log(
                    'Neither "Discard" nor "Save" buttons were clicked, meant no tweet text to save in the textarea',
                );
                resetWindow();
            }
        });

        window.addEventListener(
            'keydown',
            e => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                }
            },
            { capture: true },
        );
        window.addEventListener('online', this.sendOnlineStatus.bind(this, true), { passive: true });
        window.addEventListener('offline', this.sendOnlineStatus.bind(this, false), { passive: true });
        window.addEventListener(
            'load',
            () => {
                this.sendOnlineStatus(window.navigator.onLine);
            },
            { passive: true },
        );
    }

    private sendOnlineStatus(isOnline: boolean): void {
        const s = isOnline ? 'online' : 'offline';
        console.log('Online status:', s);
        Ipc.send('tweetapp:online-status', s);
    }

    private async inReplyTo(url: string, screenName: string, retry: number): Promise<void> {
        const a: HTMLAnchorElement | null = document.querySelector(`a[href^="/${screenName}/status/" i]`);
        if (a === null) {
            if (retry > 40) {
                console.warn(
                    'Cannot retrieve previous tweet ID from timeline after 4s. Fallback into default tweet form',
                );
                window.location.href = url;
            } else {
                // Retry
                await wait(100);
                await this.inReplyTo(url, screenName, retry + 1);
            }
            return;
        }

        // Extract last entry of path in the 'href'
        const href = a.href;
        const statusId = href.slice(href.lastIndexOf('/') + 1);

        Ipc.send('tweetapp:prev-tweet-id', statusId);

        if (this.afterTweet === 'reply previous') {
            if (url.includes('?')) {
                url += '&in_reply_to=' + statusId;
            } else {
                url += '?in_reply_to=' + statusId;
            }
        } else {
            console.log("Do nothing for 'after_tweet' configuration value:", this.afterTweet);
        }

        window.location.href = url;
        console.log('in_reply_to:', url);
    }
}
