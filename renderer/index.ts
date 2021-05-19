import { App } from './app';

function cancel(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

document.addEventListener('dragover', cancel);
document.addEventListener('drop', cancel);

new App().start();
