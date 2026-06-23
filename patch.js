const fs = require('fs');

let h = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('fab_css.txt', 'utf8');
const div = fs.readFileSync('fab_div.txt', 'utf8');
const scr = fs.readFileSync('fab_script.txt', 'utf8');

// 1. Menu — adiciona UMA vez após Controle de Metais
const menuOld = `    <div class="nav-item" onclick="goTo('metais')" data-page="metais"><i class="ti ti-weight"></i>Controle de Metais</div>`;
const menuNew = `    <div class="nav-item" onclick="goTo('metais')" data-page="metais"><i class="ti ti-weight"></i>Controle de Metais</div>
    <div class="nav-item" onclick="goTo('fabricacoes')" data-page="fabricacoes"><i class="ti ti-hammer"></i>Fabricações JF</div>`;

if (h.includes(menuOld) && !h.includes('goTo(\'fabricacoes\')')) {
  h = h.replace(menuOld, menuNew);
  console.log('✓ Menu adicionado');
} else {
  console.log('⚠ Menu já existe ou padrão não encontrado');
}

// 2. PAGE_TITLES
const titlesOld = `  configuracoes:{title:'Configurações',sub:'Gerenciar campos selecionáveis do sistema'}`;
const titlesNew = `  configuracoes:{title:'Configurações',sub:'Gerenciar campos selecionáveis do sistema'},
  fabricacoes:{title:'Fabricações JF',sub:'Estoque · Em fabricação · Vendidos — tempo real'}`;

if (h.includes(titlesOld)) {
  h = h.replace(titlesOld, titlesNew);
  console.log('✓ PAGE_TITLES adicionado');
} else {
  console.log('⚠ PAGE_TITLES padrão não encontrado');
}

// 3. goTo trigger
const gotoOld = `  if(name==='relatorios')      {} // static page`;
const gotoNew = `  if(name==='relatorios')      {} // static page
  if(name==='fabricacoes')     { fabLoad(); fabStartAutoRefresh(); }`;

if (h.includes(gotoOld)) {
  h = h.replace(gotoOld, gotoNew);
  console.log('✓ goTo trigger adicionado');
} else {
  console.log('⚠ goTo padrão não encontrado');
}

// 4. CSS
h = h.replace('</style>', css + '\n</style>');
console.log('✓ CSS adicionado');

// 5. HTML da página
const pageMarker = '      <!-- ══════ PAGE: USUÁRIOS ══════ -->';
if (h.includes(pageMarker)) {
  h = h.replace(pageMarker, '      <!-- ══════ PAGE: FABRICAÇÕES JF ══════ -->\n' + div + '\n\n' + pageMarker);
  console.log('✓ HTML da página adicionado');
} else {
  console.log('⚠ Marcador de página não encontrado');
}

// 6. Script
h = h.replace('</body>', scr + '\n</body>');
console.log('✓ Script adicionado');

fs.writeFileSync('index.html', h);
console.log('\n✅ index.html atualizado com sucesso!');