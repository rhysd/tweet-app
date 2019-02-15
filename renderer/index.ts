import Ipc from './ipc';

let afterTweet: ConfigAfterTweet = 'new tweet';

Ipc.on('tweetapp:action-after-tweet', (_: Event, action: ConfigAfterTweet | undefined) => {
    if (action) {
        console.log('Specifying action after tweet:', action);
        afterTweet = action;
    }
});

let screenName: string | null = null;
Ipc.on('tweetapp:screen-name', (_: Event, name: string) => {
    console.log('Screen name from IPC:', name);
    screenName = name;
});

function createCoverElement(): HTMLElement {
    const e = document.createElement('div');
    e.style.display = 'block';
    e.style.position = 'fixed';
    e.style.left = '0';
    e.style.top = '0';
    e.style.width = '100%';
    e.style.height = '100%';
    e.style.zIndex = '530000';
    e.style.backgroundColor = 'white';
    return e;
}

function inReplyTo(url: string, screenName: string, retry: number) {
    const a: HTMLAnchorElement | null = document.querySelector(`a[href^="/${screenName}/status/"]`);
    if (a === null) {
        if (retry > 40) {
            window.location.href = url;
            console.warn('Cannot retrieve previous tweet ID from timeline after 4s. Fallback into default tweet form');
        } else {
            // Retry
            setTimeout(() => inReplyTo(url, screenName, retry + 1), 100);
        }
        return;
    }

    // Extract last entry of path in the 'href'
    const href = a.href;
    const statusId = href.slice(href.lastIndexOf('/') + 1);

    Ipc.send('tweetapp:prev-tweet-id', statusId);

    switch (afterTweet) {
        case 'reply previous':
            if (url.includes('?')) {
                url += '&in_reply_to=' + statusId;
            } else {
                url += '?in_reply_to=' + statusId;
            }
            break;
        case 'new tweet':
            /* do nothing */
            break;
        default:
            console.warn("Unknown value for 'after_tweet' configuration value:", afterTweet);
            break;
    }

    window.location.href = url;
    console.log('in_reply_to:', url);
}

Ipc.on('tweetapp:sent-tweet', (_: Event, url: string) => {
    console.log('tweet posted. next URL:', url);
    if (screenName === null) {
        window.location.href = url;
        console.log('Screen name is not set. Open:', url);
        return;
    }
    document.body.appendChild(createCoverElement());
    inReplyTo(url, screenName, 0);
});

Ipc.on('tweetapp:open', (_: Event, url: string) => {
    window.location.href = url;
    console.log('Open URL due to tweetapp:open message:', url);
});

function findTweetButton(): HTMLElement | null {
    const button = document.querySelector('[data-testid="tweetButton"]') as HTMLElement;
    if (button !== null) {
        return button;
    }

    const text = ['Tweet', 'Tweet All', 'Reply', 'ツイート', 'すべてツイート', '返信'];
    const buttons = document.querySelectorAll('[role="button"][tabIndex="0"]') as NodeList;
    for (const b of buttons) {
        const label = b.textContent;
        if (label === null) {
            continue;
        }
        if (text.indexOf(label) >= 0) {
            return b as HTMLElement;
        }
    }

    console.warn("Could not find 'Tweet' button");
    return null; // Not found
}

Ipc.on('tweetapp:click-tweet-button', (_: Event) => {
    const btn = findTweetButton();
    if (btn !== null) {
        console.log('Click tweet button', btn);
        btn.click();
    }
});
