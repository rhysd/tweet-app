import Ipc from './ipc';

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default class App {
    private afterTweet: ConfigAfterTweet = 'new tweet';
    private screenName: string | null = null;

    public start() {
        function createCoverElement() {
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

        function findTweetButton(): HTMLElement | null {
            const button = document.querySelector('[data-testid="tweetButton"]') as HTMLElement;
            if (button !== null) {
                return button;
            }

            // XXX: TENTATIVE: detect tweet button by aria label
            const text = ['Tweet', 'Tweet All', 'Reply', 'ツイート', 'すべてツイート', '返信'];
            const buttons = document.querySelectorAll('[role="button"][tabIndex="0"]') as NodeList;
            for (const b of buttons) {
                const label = b.textContent;
                if (label === null) {
                    continue;
                }
                if (text.includes(label)) {
                    return b as HTMLElement;
                }
            }

            console.warn("Could not find 'Tweet' button");
            return null; // Not found
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
            const loginInput = document.querySelector('input[name*="username_or_email"]') as HTMLInputElement | null;
            if (loginInput === null || this.screenName === null) {
                console.warn('Cannot set screen name to <input>', loginInput, this.screenName);
                return;
            }

            loginInput.value = this.screenName;

            const passwordInput = document.querySelector('input[name*="password"]') as HTMLInputElement | null;
            if (passwordInput !== null) {
                passwordInput.focus();
            }
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

    private sendOnlineStatus(isOnline: boolean) {
        const s = isOnline ? 'online' : 'offline';
        console.log('Online status:', s);
        Ipc.send('tweetapp:online-status', s);
    }

    private async inReplyTo(url: string, screenName: string, retry: number) {
        const a: HTMLAnchorElement | null = document.querySelector(`a[href^="/${screenName}/status/"]`);
        if (a === null) {
            if (retry > 40) {
                window.location.href = url;
                console.warn(
                    'Cannot retrieve previous tweet ID from timeline after 4s. Fallback into default tweet form',
                );
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
