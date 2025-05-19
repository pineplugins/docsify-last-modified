window.$docsify = window.$docsify || {};
window.$docsify.plugins = window.$docsify.plugins || [];

window.$docsify.plugins.push(function (hook, vm) {
  hook.afterEach(function (html, next) {
    const slug = (vm.route.file || 'README.md').replace(/\.md$/, '').toUpperCase();
    const meta = window.pageMeta ? window.pageMeta[slug] : null;
    if (!meta) return next(html);

    const dateStr = new Date(meta.date).toLocaleString();
    const footer = `
      <div class="last-modified-footer" style="
        margin-top: 2em;
        padding: 1em;
        border-top: 1px solid #ccc;
        font-size: 0.85em;
        color: #444;
        background-color: #f9f9f9;
        border-radius: 5px;
        cursor: default;
        user-select: none;
      ">
        <div>Last updated: ${dateStr} by ${meta.author}</div>
        <div>Email: <a href="mailto:${meta.email}">${meta.email}</a></div>
        <div>Commit message: ${meta.message}</div>
        <div>SHA: <code>${meta.sha}</code></div>
        <div>Branch: ${meta.branch || '-'}</div>
        <div style="
          margin-top: 1em;
          color: #007acc;
          cursor: pointer;
          user-select: none;
          text-decoration: underline;
        " title="Click to view raw JSON metadata" id="openRawMeta">
          Click here to view raw metadata
        </div>
      </div>
    `;
    next(html + footer);

    setTimeout(() => {
      const openRawMeta = document.getElementById('openRawMeta');
      if (!openRawMeta) return;

      openRawMeta.onclick = () => {
        const newWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
        newWindow.document.write('<pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px;">' + JSON.stringify(meta, null, 2) + '</pre>');
        newWindow.document.title = slug + ' - Raw Metadata';
        newWindow.document.close();
      };
    }, 100);
  });
});
