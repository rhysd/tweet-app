import Ipc from './ipc';

Ipc.on('tweetapp:config', (_: Event, config: Config) => {
    console.log('TODO: Config:', config);
});

Ipc.on('tweetapp:sent-tweet', (_: Event, url: string) => {
    // TODO: Retrieve previously tweeted tweet's ID with querySelector and redirect to tweet form with the ID
    window.location.href = url;
});
