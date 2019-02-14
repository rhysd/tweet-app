import Ipc from './ipc';

Ipc.on('tweetapp:config', (_: Event, config: Config) => {
    console.log('TODO: Config:', config);
});

let screenName: string | null = null;
Ipc.on('tweetapp:screen-name', (_: Event, name: string) => {
    console.log('Screen name from IPC:', name);
    screenName = name;
});

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

    if (url.includes('?')) {
        url += '&in_reply_to=' + statusId;
    } else {
        url += '?in_reply_to=' + statusId;
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
    inReplyTo(url, screenName, 0);
});

Ipc.on('tweetapp:open', (_: Event, url: string) => {
    window.location.href = url;
    console.log('Open URL due to tweetapp:open message:', url);
});
