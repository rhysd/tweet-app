import Ipc from './ipc';

Ipc.on('tweetapp:config', (_: Event, config: Config) => {
    console.log('TODO: Config:', config);
});

Ipc.on('tweetapp:sent-tweet', (_: Event) => {
    window.location.href = 'https://mobile.twitter.com/compose/tweet';
});
