import App from './app';

function cancel(e: Event) {
    e.preventDefault();
    e.stopPropagation();
}

document.addEventListener('dragover', cancel);
document.addEventListener('drop', cancel);

new App().start();
