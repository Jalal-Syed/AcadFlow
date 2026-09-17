(function() {
  if (document.getElementById('af-capture-btn')) return 'already_injected';

  var btn = document.createElement('button');
  btn.id = 'af-capture-btn';
  btn.innerHTML = '&#128229; Capture';
  btn.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647',
    'background:#6C63FF', 'color:#fff', 'border:none', 'border-radius:24px',
    'padding:12px 22px', 'font-size:15px', 'font-weight:700',
    'font-family:system-ui,-apple-system,sans-serif', 'cursor:pointer',
    'box-shadow:0 4px 20px rgba(108,99,255,0.55)', 'user-select:none',
    '-webkit-tap-highlight-color:transparent'
  ].join(';');

  btn.addEventListener('click', function() {
    btn.innerHTML = '&#8987; Capturing...';
    btn.disabled = true;
    try {
      var iframe = document.querySelector('iframe');
      var doc = (iframe && iframe.contentDocument) ? iframe.contentDocument : document;
      var tables = Array.prototype.map.call(
        doc.querySelectorAll('table'), function(table) { return table.outerHTML; }
      ).join('\\n');
      var payload = JSON.stringify({
        url: window.location.href,
        title: document.title,
        tables: tables
      });
      window._afCapturePayload = payload;
      if (window.AcadFlowCapture) window.AcadFlowCapture.onCapture(payload);
      btn.innerHTML = '&#10003; Captured!';
      btn.style.background = '#2ED573';
    } catch (error) {
      btn.innerHTML = '&#128229; Capture';
      btn.disabled = false;
    }
  });

  if (document.body) document.body.appendChild(btn);
  return 'injected';
})()
