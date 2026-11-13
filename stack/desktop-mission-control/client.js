window.__ModuleLoader__.load({
  id: 'scott-dsh-desktop-mission-control',
  factory: require => {
    const {createElement: h, useEffect, useRef} = require('react');
    const PANEL = 'desktop-mission-control';
    const ORIGIN = 'http://127.0.0.1:3091';
    const inject = ['slots', 'layout'];
    function MissionControl({layout}) {
      const frame = useRef(null);
      useEffect(() => {
        const receive = event => {
          if (event.origin !== ORIGIN || event.source !== frame.current?.contentWindow) return;
          if (event.data?.type === 'desktop-mission-control:open-conversation') layout.selectPanel('conversation');
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
      }, [layout]);
      return h('iframe', {
        ref: frame, src: ORIGIN + '/', title: 'Desktop Mission Control',
        sandbox: 'allow-scripts allow-same-origin allow-forms allow-modals allow-downloads',
        style: {border: 0, width: '100%', height: '100%', display: 'block', background: '#0a0f19'},
        'data-desktop-mission-control': true,
      });
    }
    function Icon({size = 20}) {
      return h('svg', {width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true},
        h('rect', {x: 3, y: 3, width: 18, height: 18, rx: 3}), h('path', {d: 'M3 10h18M10 10v11M6 6.5h.01M9 6.5h.01M13 17l2-3 2 2 2-3'}));
    }
    function apply(ctx) {
      ctx.slots.inject('main', () => ctx.slots.register({name: 'main', key: PANEL,
        inject: () => ({layout: ctx.layout})}, MissionControl));
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({name: 'sidebar.panellist', id: PANEL,
        label: 'Mission Control', order: 10}, Icon));
    }
    return {apply, inject, MissionControl};
  },
});
