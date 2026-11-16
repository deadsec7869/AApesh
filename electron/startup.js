const status = document.getElementById('status');
const error = document.getElementById('error');
const retry = document.getElementById('retry');
const quit = document.getElementById('quit');

function showError(message) {
  document.body.classList.add('failed');
  status.textContent = 'AAPESH could not start its local music service.';
  error.textContent = message;
}

window.aapeshDesktop?.onStartupError(showError);

retry.addEventListener('click', async () => {
  retry.disabled = true;
  status.textContent = 'Restarting the music service…';
  document.body.classList.remove('failed');
  try {
    const started = await window.aapeshDesktop.retryBackend();
    if (!started) showError('Please check the application log and try again.');
  } catch {
    showError('Please check the application log and try again.');
  } finally {
    retry.disabled = false;
  }
});

quit.addEventListener('click', () => window.aapeshDesktop?.quit());
