/* Keep the flood model and its 2D/3D camera independent of workspace navigation. */
(function prepareFloodWorkspace(){
  const q=s=>document.querySelector(s),main=q('main'),oldMap=q('.map-column'),config=q('.grid>aside'),timeline=q('.grid+section'),objects=q('.lower>section'),objectCard=q('.lower>section:last-child'),stats=q('.stats'),actions=q('.panel-buttons'),scope=q('#floodScopeLabel'),foot=q('.foot');
  document.body.classList.add('iw-monitoring');document.body.dataset.iwView='map';
  const header=q('infrawatch-header');
  new ResizeObserver(()=>document.body.style.setProperty('--iw-header',header.getBoundingClientRect().height+'px')).observe(header);
  main.className='iw-app-shell';
  const toolbar=document.createElement('div');toolbar.className='workspace-toolbar';
  toolbar.innerHTML='<nav class="view-tabs" role="tablist" aria-label="Widok obszaru roboczego"><button role="tab" id="tab-map" aria-selected="true" aria-controls="mapView" data-workspace="map">Mapa</button><button role="tab" id="tab-asset" aria-selected="false" aria-controls="assetView" data-workspace="asset" tabindex="-1">Obiekt</button><button role="tab" id="tab-analysis" aria-selected="false" aria-controls="analysisView" data-workspace="analysis" tabindex="-1">Analiza</button></nav>';
  actions.prepend(Object.assign(document.createElement('button'),{id:'toggleDetail',textContent:'Szczegóły'}));
  actions.prepend(Object.assign(document.createElement('button'),{id:'toggleLayers',textContent:'Warstwy'}));toolbar.append(actions);
  const shell=document.createElement('div');shell.className='gis-app';
  shell.innerHTML='<aside class="locations-panel" id="workspaceLayers" aria-label="Warstwy i obiekty"><button class="close-drawer" data-close-workspace aria-label="Zamknij panel warstw">×</button><div class="sidebar-heading"><div class="eyebrow">Energetyka / powódź</div><h1>Zalanie infrastruktury</h1></div><div class="sidebar-tabs"><button class="selected" data-side="layers" aria-controls="layersPanel" aria-pressed="true">Warstwy</button><button data-side="locations" aria-controls="locationsTab" aria-pressed="false">Obiekty F401</button></div><div class="sidebar-content"><section id="layersPanel"><h2 class="section-caption">Podkład mapy</h2></section><section id="locationsTab" hidden></section></div></aside><div class="map-workspace"><section id="mapView" class="workspace-grid" role="tabpanel" aria-labelledby="tab-map"></section><section id="assetView" class="object-view" role="tabpanel" aria-labelledby="tab-asset" hidden><div class="iw-object-card"><div id="assetContent"></div><button id="objectOnMap">Pokaż obiekt na mapie</button></div></section><section id="analysisView" class="analysis-view" role="tabpanel" aria-labelledby="tab-analysis" hidden><p class="eyebrow">Analiza / scenariusz demonstracyjny</p><h2>Symulacja wezbrania · 72 godziny</h2><p>Ustaw przebieg scenariusza. Zmiany zasięgu wody i ekspozycji słupów obejrzysz na mapie 2D lub w terenie 3D.</p><div class="flood-analysis-grid"></div><button id="analysisOnMap">Zobacz scenariusz na mapie</button></section></div>';
  shell.querySelector('.sidebar-heading').append(scope);
  const layers=shell.querySelector('#layersPanel'),mapButtons=q('.mapbuttons');
  layers.append(mapButtons);
  const configure=document.createElement('button');configure.id='configureFlood';configure.className='sidebar-link';configure.textContent='Ustaw scenariusz wezbrania →';layers.append(configure);
  shell.querySelector('#locationsTab').append(objects);objects.className='flood-objects';
  oldMap.className='map-column';oldMap.id='floodMapColumn';
  timeline.className='timeline';timeline.removeAttribute('style');timeline.querySelector('.eyebrow').textContent='Oś czasu scenariusza';timeline.querySelector('h2').textContent='Przebieg wezbrania · 0–72 h';oldMap.append(timeline);
  objectCard.className='detail-panel';objectCard.id='detailPanel';objectCard.prepend(Object.assign(document.createElement('button'),{className:'close-drawer',textContent:'×'}));objectCard.firstChild.setAttribute('data-close-workspace','');objectCard.firstChild.setAttribute('aria-label','Zamknij szczegóły');
  shell.querySelector('#mapView').append(oldMap,objectCard);
  config.className='analysis-card';shell.querySelector('.flood-analysis-grid').append(config);
  const summary=document.createElement('section');summary.className='analysis-card';summary.innerHTML='<h3>Jak czytać wynik?</h3><p>Wybierz „Do kulminacji” na osi czasu, a następnie słup na mapie lub na liście „Obiekty F401”. Karta pokazuje modelową głębokość w komórce terenu.</p><p>Tryb 3D oferuje detal wybranego słupa, warstwice, zmianę skali pionowej i duży widok. Te ustawienia służą wizualizacji i nie zmieniają obliczeń.</p><p>Model obejmuje rejon Kozienic. W innych lokalizacjach dostępne są zdjęcia i infrastruktura GIS; symulacja pozostaje wyłączona.</p><p>Scenariusz nie jest prognozą ani oceną uszkodzeń. Nie uwzględnia przepływu i wałów.</p><a href="../04-flood-2d-3d-v2/">Otwórz archiwalne menu v2 →</a>';shell.querySelector('.flood-analysis-grid').append(summary);
  stats.className='workspace-metrics flood-metrics';stats.querySelectorAll('.stat').forEach(n=>n.className='flood-metric');
  main.replaceChildren(toolbar,stats,shell);
  toolbar.setAttribute('aria-busy','true');
  const loading=document.createElement('span');loading.id='floodWorkspaceLoading';loading.setAttribute('role','status');loading.textContent='Wczytywanie danych…';toolbar.append(loading);
  document.querySelectorAll('[data-workspace],#toggleLayers,#toggleDetail,#configureFlood,#export').forEach(b=>{b.disabled=true;b.dataset.floodPending='true'});
  foot.className='flood-source-foot';q('#modal').insertBefore(foot,q('#close'));
})();

function installUnifiedFloodWorkspace(){
  const q=s=>document.querySelector(s);let workspace='map',subject=q('#floodGISDetails').hidden?'tower':'gis';
  const resize=()=>{if(workspace==='map'){map.invalidateSize({pan:false});if(state.view==='3d')draw3d()}};
  function show(view){
    if(!['map','asset','analysis'].includes(view))return;
    terrainRenderer?.closeStage();
    if(view!=='map'&&timer)q('#play').click();
    workspace=view;
    for(const name of ['map','asset','analysis'])q('#'+name+'View').hidden=name!==view;
    document.querySelectorAll('[data-workspace]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.workspace===view)));
    if(view==='map')InfraWatchTerrain3D.setVisible(state.view==='3d');else InfraWatchTerrain3D.setVisible(false);
    InfraWatchUI.closePanels();resize();requestAnimationFrame(resize);
  }
  document.querySelectorAll('[data-workspace]').forEach(b=>b.onclick=()=>show(b.dataset.workspace));
  document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-side]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});
    q('#layersPanel').hidden=b.dataset.side!=='layers';q('#locationsTab').hidden=b.dataset.side!=='locations';
  });
  function mirror(){
    const target=q('#assetContent'),source=subject==='gis'?q('#floodGISDetails'):q('#asset');
    q('#asset').hidden=subject!=='tower';q('#floodGISDetails').hidden=subject!=='gis';
    q('#detailSubjectTitle').textContent=subject==='gis'?'Wybrany obiekt GIS':'Wybrany słup przesyłowy';
    target.replaceChildren(q('#detailSubjectTitle').cloneNode(true),...Array.from(source.childNodes,n=>n.cloneNode(true)));
    target.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    q('#objectOnMap').disabled=subject==='tower'?!state.selected:!window.focusFloodGISSelection;
  }
  const title=q('#detailPanel h2');title.id='detailSubjectTitle';
  window.InfraWatchFloodWorkspace={show,selected(kind){subject=kind;if(kind==='tower')window.clearFloodGISSelection?.();mirror();InfraWatchUI.openDetails()},clearGIS(){subject='tower';mirror()}};
  const oldSelect=select;select=function(p){oldSelect(p);InfraWatchFloodWorkspace.selected('tower')};
  new MutationObserver(mirror).observe(q('#asset'),{childList:true,subtree:true,characterData:true});
  new MutationObserver(mirror).observe(q('#floodGISDetails'),{childList:true,subtree:true,characterData:true});
  q('#configureFlood').onclick=()=>show('analysis');q('#analysisOnMap').onclick=()=>show('map');
  q('#objectOnMap').onclick=()=>{show('map');setView('2d');if(subject==='gis')window.focusFloodGISSelection?.();else if(state.selected)map.setView([state.selected.lat,state.selected.lon],15)};
  InfraWatchUI.install({layersButton:'#toggleLayers',detailsButton:'#toggleDetail',isMap:()=>workspace==='map',showMap:()=>show('map'),resize});
  const oldView=setView;setView=function(view){if(workspace!=='map')show('map');oldView(view);InfraWatchUI.sync()};
  mirror();resize();
  document.querySelectorAll('[data-flood-pending]').forEach(b=>{b.disabled=false;delete b.dataset.floodPending});
  q('.workspace-toolbar').setAttribute('aria-busy','false');q('#floodWorkspaceLoading').hidden=true;
}
