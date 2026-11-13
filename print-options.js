/* Fleet Health Score - opções de impressão do PDF (logo opcional, sem persistência). */
(function () {
  'use strict';

  var MAX_BYTES = 512 * 1024;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectStyle() {
    if (document.getElementById('printOptionsStyle')) return;
    var style = document.createElement('style');
    style.id = 'printOptionsStyle';
    style.textContent =
      '.po-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,12,24,.68);backdrop-filter:blur(4px)}' +
      '.po-card{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;color:#0f172a;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(2,6,23,.45);font:14px/1.45 "Segoe UI",system-ui,Arial,sans-serif}' +
      '.po-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}' +
      '.po-head h2{margin:0;font-size:19px;letter-spacing:-.01em}' +
      '.po-sub{margin:4px 0 0;color:#64748b;font-size:12px}' +
      '.po-x{width:32px;height:32px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:9px;font-size:20px;line-height:1;cursor:pointer;color:#475569}' +
      '.po-check{display:flex;align-items:center;gap:9px;margin:16px 0;padding:11px 12px;border:1px solid #dbe3ec;border-radius:11px;background:#f8fbff;font-weight:800;cursor:pointer}' +
      '.po-check input{width:17px;height:17px;margin:0;accent-color:#0ea5e9}' +
      '.po-drop{border:1px dashed #cbd5e1;border-radius:12px;padding:14px;background:#fbfdff}' +
      '.po-file-label{display:block;font-weight:800;font-size:12px;margin-bottom:7px}' +
      '.po-drop input[type=file]{width:100%;font-size:12px}' +
      '.po-hint{color:#64748b;font-size:11px;margin-top:7px;line-height:1.5}' +
      '.po-preview{display:flex;align-items:center;justify-content:center;min-height:76px;margin-top:11px;padding:8px;border-radius:9px;background:#eef2f7;border:1px solid #dbe3ec;color:#94a3b8;font-size:12px}' +
      '.po-preview img{max-width:220px;max-height:64px;object-fit:contain}' +
      '.po-msg{min-height:18px;margin:10px 0 0;font-size:12px;color:#b91c1c}' +
      '.po-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px}' +
      '.po-actions button{height:36px;padding:0 16px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:800;font-size:12px;cursor:pointer}' +
      '.po-actions .po-ok{background:linear-gradient(135deg,#0ea5e9,#0369a1);border:0;color:#fff}';
    document.head.appendChild(style);
  }

  function safeSvg(text) {
    var bad = /<script|onload\s*=|onerror\s*=|onclick\s*=|javascript:|<foreignObject|<iframe|<!ENTITY|xlink:href\s*=\s*["']\s*(?:https?:|\/\/)/i;
    return !bad.test(String(text || ''));
  }

  function isSvg(file, name) {
    return /svg/i.test(file.type || '') || /\.svg$/i.test(name);
  }

  function isRaster(file, name) {
    return /^image\/(png|jpeg|webp)$/i.test(file.type || '') || /\.(png|jpe?g|webp)$/i.test(name);
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve('');
      var name = file.name || '';
      if (file.size > MAX_BYTES) return reject(new Error('O logo deve ter no máximo 512 KB.'));
      if (isSvg(file, name)) {
        return file.text().then(function (text) {
          if (!safeSvg(text)) return reject(new Error('O SVG contém conteúdo não permitido. Use um SVG simples, sem scripts.'));
          resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text));
        }).catch(function () {
          reject(new Error('Não foi possível ler o SVG.'));
        });
      }
      if (!isRaster(file, name)) return reject(new Error('Envie um arquivo SVG, PNG, JPG ou WebP.'));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Não foi possível ler o arquivo.')); };
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.readAsDataURL(file);
    });
  }

  function ask(options) {
    options = options || {};
    if (!document || !document.body) return Promise.resolve({ includeLogo: false, logo: '' });
    injectStyle();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'po-overlay';
      overlay.innerHTML =
        '<section class="po-card" role="dialog" aria-modal="true" aria-labelledby="poTitle">' +
          '<div class="po-head"><div><h2 id="poTitle">' + esc(options.title || 'Imprimir PDF') + '</h2>' +
            '<p class="po-sub">' + esc(options.subtitle || 'Escolha se o relatório deve levar um logo.') + '</p></div>' +
            '<button type="button" class="po-x" aria-label="Fechar">&times;</button></div>' +
          '<label class="po-check"><input type="checkbox" data-po="include"/> Incluir logo no PDF</label>' +
          '<div class="po-drop">' +
            '<label class="po-file-label" for="poFile">Logo do relatório (SVG, PNG, JPG ou WebP)</label>' +
            '<input id="poFile" type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"/>' +
            '<div class="po-hint">O logo é aplicado no cabeçalho, na capa/índice e nos rodapés deste PDF. Ele não é salvo na base.</div>' +
            '<div class="po-preview" data-po="preview"><span>Nenhum logo selecionado</span></div>' +
          '</div>' +
          '<p class="po-msg" data-po="msg" role="status"></p>' +
          '<div class="po-actions"><button type="button" data-po="cancel">Cancelar</button>' +
            '<button type="button" class="po-ok" data-po="ok">Gerar PDF</button></div>' +
        '</section>';
      document.body.appendChild(overlay);

      var include = overlay.querySelector('[data-po="include"]');
      var fileInput = overlay.querySelector('#poFile');
      var preview = overlay.querySelector('[data-po="preview"]');
      var msg = overlay.querySelector('[data-po="msg"]');
      var okBtn = overlay.querySelector('[data-po="ok"]');
      var cancelBtn = overlay.querySelector('[data-po="cancel"]');
      var closeBtn = overlay.querySelector('.po-x');
      var dataUrl = '';
      var busy = false;

      function finish(result) {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        resolve(result);
      }
      function cancel() { finish(null); }
      function onKey(event) { if (event.key === 'Escape') cancel(); }

      function showPreview(src, label) {
        if (src) {
          preview.innerHTML = '';
          var img = document.createElement('img');
          img.src = src;
          img.alt = 'Prévia do logo';
          preview.appendChild(img);
        } else {
          preview.innerHTML = '<span>' + esc(label || 'Nenhum logo selecionado') + '</span>';
        }
      }

      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        msg.textContent = '';
        if (!file) {
          dataUrl = '';
          showPreview('');
          return;
        }
        busy = true;
        okBtn.disabled = true;
        msg.style.color = '#64748b';
        msg.textContent = 'Preparando logo...';
        fileToDataUrl(file).then(function (url) {
          dataUrl = url;
          include.checked = true;
          showPreview(url, file.name);
          msg.textContent = '';
        }).catch(function (error) {
          dataUrl = '';
          include.checked = false;
          showPreview('');
          msg.style.color = '#b91c1c';
          msg.textContent = error && error.message ? error.message : 'Não foi possível usar este logo.';
        }).finally(function () {
          busy = false;
          okBtn.disabled = false;
          msg.style.color = msg.textContent ? '#b91c1c' : '';
        });
      });

      include.addEventListener('change', function () {
        if (include.checked && !dataUrl) {
          msg.style.color = '#64748b';
          msg.textContent = 'Selecione o arquivo do logo para incluí-lo no PDF.';
        } else {
          msg.textContent = '';
        }
      });

      okBtn.addEventListener('click', function () {
        if (busy) return;
        if (include.checked && !dataUrl) {
          msg.style.color = '#b91c1c';
          msg.textContent = 'Selecione o logo ou desmarque a opção para gerar o PDF sem logo.';
          return;
        }
        finish({ includeLogo: !!include.checked, logo: include.checked ? dataUrl : '' });
      });

      cancelBtn.addEventListener('click', cancel);
      closeBtn.addEventListener('click', cancel);
      overlay.addEventListener('click', function (event) { if (event.target === overlay) cancel(); });
      document.addEventListener('keydown', onKey);
      setTimeout(function () { include.focus(); }, 30);
    });
  }

  function decorate(stage, logo) {
    if (!stage || !logo) return;
    function img(className) {
      var el = document.createElement('img');
      el.className = className || 'pdf-footer-logo';
      el.src = logo;
      el.alt = 'Logo do relatório';
      el.style.cssText = 'height:18px;max-width:110px;object-fit:contain;vertical-align:middle;opacity:.92';
      return el;
    }
    stage.querySelectorAll('.pdf-footer').forEach(function (footer) {
      if (footer.querySelector('.pdf-footer-logo')) return;
      var el = img('pdf-footer-logo');
      el.style.marginRight = '8px';
      footer.insertBefore(el, footer.firstChild);
    });
    stage.querySelectorAll('.pdf-brand, .pcp-header').forEach(function (head) {
      if (head.querySelector('img')) return;
      var el = img('pdf-logo');
      el.style.height = head.classList.contains('pcp-header') ? '64px' : '42px';
      el.style.maxWidth = '180px';
      head.appendChild(el);
    });
  }

  window.PrintOptions = { ask: ask, decorate: decorate, fileToDataUrl: fileToDataUrl };
})();
