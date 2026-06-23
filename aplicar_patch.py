import sys

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Menu lateral
html = html.replace(
    """    <div class="nav-item" onclick="goTo('metais')" data-page="metais"><i class="ti ti-weight"></i>Controle de Metais</div>""",
    """    <div class="nav-item" onclick="goTo('metais')" data-page="metais"><i class="ti ti-weight"></i>Controle de Metais</div>
    <div class="nav-item" onclick="goTo('fabricacoes')" data-page="fabricacoes"><i class="ti ti-hammer"></i>Fabricações JF</div>"""
)

# 2. PAGE_TITLES
html = html.replace(
    "  configuracoes:{title:'Configurações',sub:'Gerenciar campos selecionáveis do sistema'}",
    "  configuracoes:{title:'Configurações',sub:'Gerenciar campos selecionáveis do sistema'},\n  fabricacoes:{title:'Fabricações JF',sub:'Estoque · Em fabricação · Vendidos — tempo real'}"
)

# 3. goTo trigger
html = html.replace(
    "  if(name==='relatorios')      {} // static page",
    "  if(name==='relatorios')      {} // static page\n  if(name==='fabricacoes')     { fabLoad(); fabStartAutoRefresh(); }"
)

# 4. CSS — antes do </style>
CSS = open("fab_css.txt").read()
html = html.replace("</style>", CSS + "\n</style>", 1)

# 5. HTML da página — antes de PAGE: USUARIOS
DIV = open("fab_div.txt").read()
html = html.replace(
    "      <!-- ══════ PAGE: USUÁRIOS ══════ -->",
    "      <!-- ══════ PAGE: FABRICAÇÕES JF ══════ -->\n      " + DIV + "\n\n      <!-- ══════ PAGE: USUÁRIOS ══════ -->"
)

# 6. Script — antes de </body>
SCRIPT = open("fab_script.txt").read()
html = html.replace("</body>", SCRIPT + "\n</body>")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html atualizado com sucesso!")
