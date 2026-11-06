/* A short hold lifts a playlist; clicks and scrolling keep their usual behavior. */
((scope) => {
  function mount(container, move) {
    let pending, drag, timer, frame, suppressClick = false;
    const lifecycle = new AbortController();
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, {...options, signal:lifecycle.signal});
    const rows = () => [...container.querySelectorAll('[data-playlist-id]')];
    function stopTracking() {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerCancel);
    }
    const pointerUp = () => finish(true);
    const pointerCancel = () => finish();
    function targetAt(x, y) {
      container.querySelectorAll('.playlist-drop-before,.playlist-drop-after').forEach(row => row.classList.remove('playlist-drop-before', 'playlist-drop-after'));
      const target = document.elementFromPoint(x, y)?.closest('[data-playlist-id]');
      drag.target = target && container.contains(target) && target !== drag.row ? target : null;
      if (drag.target) {
        const rect = target.getBoundingClientRect();
        drag.after = y > rect.top + rect.height / 2;
        target.classList.add(drag.after ? 'playlist-drop-after' : 'playlist-drop-before');
      }
    }
    function scroll() {
      if (!drag) return;
      if (!drag.row.isConnected) { finish(); return; }
      const rect = drag.scroller === document.scrollingElement ? {top: 0, bottom: innerHeight} : drag.scroller.getBoundingClientRect();
      const speed = drag.y < rect.top + 64 ? -9 : drag.y > rect.bottom - 64 ? 9 : 0;
      if (speed) { drag.scroller.scrollTop += speed; targetAt(drag.x, drag.y); }
      frame = requestAnimationFrame(scroll);
    }
    function finish(commit = false) {
      clearTimeout(timer);
      stopTracking();
      pending = null;
      if (!drag) return;
      const {row, ghost, target, after, pointerId} = drag;
      const ids = rows().map(row => row.dataset.playlistId);
      const source = row.dataset.playlistId;
      const destination = target?.dataset.playlistId;
      row.classList.remove('playlist-drag-source');
      ghost.remove();
      container.classList.remove('playlist-dragging');
      container.querySelectorAll('.playlist-drop-before,.playlist-drop-after').forEach(row => row.classList.remove('playlist-drop-before', 'playlist-drop-after'));
      drag = null;
      cancelAnimationFrame(frame);
      if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
      if (commit && destination) move(source, destination, after, ids);
      // The release must never follow the playlist link.
      setTimeout(() => { suppressClick = false; }, 0);
    }
    listen(container, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false || drag) return;
      suppressClick = false;
      const row = event.target.closest('[data-playlist-id]');
      if (!row || event.target.closest('summary,input,textarea,.sf-menu,.playlist-menu')) return;
      window.addEventListener('pointermove', pointerMove, {passive:false});
      window.addEventListener('pointerup', pointerUp);
      window.addEventListener('pointercancel', pointerCancel);
      pending = {row, x:event.clientX, y:event.clientY, pointerId:event.pointerId};
      timer = setTimeout(() => {
        if (!pending || !row.isConnected) return;
        const rect = row.getBoundingClientRect();
        const ghost = row.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.removeAttribute('data-playlist-id');
        ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        ghost.setAttribute('aria-hidden', 'true');
        ghost.classList.add('playlist-drag-ghost');
        Object.assign(ghost.style, {width:rect.width+'px', height:rect.height+'px', left:rect.left+'px', top:rect.top+'px'});
        container.append(ghost);
        let scroller = container;
        while (scroller.parentElement && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
        if (!scroller.parentElement) scroller = document.scrollingElement;
        drag = {...pending, ghost, scroller, left:rect.left, top:rect.top, startX:pending.x, startY:pending.y};
        pending = null;
        suppressClick = true;
        row.classList.add('playlist-drag-source');
        container.classList.add('playlist-dragging');
        container.setPointerCapture?.(event.pointerId);
        frame = requestAnimationFrame(scroll);
      }, 300);
    });
    function pointerMove(event) {
      if (pending && Math.hypot(event.clientX-pending.x, event.clientY-pending.y) > 8) { finish(); return; }
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      drag.x = event.clientX; drag.y = event.clientY;
      drag.ghost.style.transform = `translate(${drag.x-drag.startX}px,${drag.y-drag.startY}px) scale(1.02)`;
      targetAt(drag.x, drag.y);
    }
    listen(container, 'lostpointercapture', () => finish());
    listen(container, 'dragstart', event => { if (event.target.closest('[data-playlist-id]')) event.preventDefault(); });
    listen(container, 'click', event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {capture:true});
    listen(container, 'keydown', event => {
      if (event.key === 'Escape') { finish(); return; }
      if (!event.altKey || !['ArrowUp','ArrowDown'].includes(event.key)) return;
      const row = event.target.closest('[data-playlist-id]');
      const items = rows(), index = items.indexOf(row), offset = event.key === 'ArrowUp' ? -1 : 1;
      if (index < 0 || !items[index+offset]) return;
      event.preventDefault();
      move(row.dataset.playlistId, items[index+offset].dataset.playlistId, offset > 0, items.map(row => row.dataset.playlistId));
    });
    listen(window, 'blur', () => finish());
    return {cancel: () => finish(), destroy: () => { finish(); lifecycle.abort(); }};
  }
  scope.PlaylistDrag = {mount};
})(globalThis);
