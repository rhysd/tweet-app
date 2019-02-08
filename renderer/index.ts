import Ipc from './ipc';

Ipc.on('tweetapp:config', (_: Event, config: Config) => {
    console.log(config);
});
