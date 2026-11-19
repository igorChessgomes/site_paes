// =========================================================
// COLE AQUI A URL DO SEU FIREBASE (SEM BARRA NO FINAL)
// Exemplo: "https://site-oficial-paes-default-rtdb.firebaseio.com"
// =========================================================
const URL_BANCO = "https://site-oficial-paes-default-rtdb.firebaseio.com/";

// =========================================================
// 1. LISTA FIXA DE PARTICIPANTES (16 convidados)
// =========================================================
const PARTICIPANTES = [
    { pin: "000X", nome: "Igor", admin: true },
    { pin: "0001", nome: "Marcela", admin: false },
    { pin: "0010", nome: "Priscila", admin: false },
    { pin: "0011", nome: "Ester", admin: false },
    { pin: "0100", nome: "Edijalma", admin: false },
    { pin: "0101", nome: "Gessner", admin: false },
    { pin: "0110", nome: "Kyioshi", admin: false },
    { pin: "0111", nome: "Camille", admin: false },
    { pin: "1000", nome: "Igarashi", admin: false },
    { pin: "1001", nome: "Paulinha", admin: false },
    { pin: "1010", nome: "Evely", admin: false },
    { pin: "1011", nome: "Gustavo", admin: false },
    { pin: "1100", nome: "Nicole", admin: false },
    { pin: "1101", nome: "Henrique", admin: false },
    { pin: "1110", nome: "Euller", admin: false },
    { pin: "1111", nome: "Yasmin", admin: false }
];

// =========================================================
// 2. ESTADO DO EVENTO (MODOS AMIGO E INIMIGO SEPARADOS)
// =========================================================
let modoAtual = "amigo"; // Alterna entre "amigo" e "inimigo"

let estadoEvento = {
    amigo: [],   // Cada item: { pinAvaliador, avaliador, presenteador, presente, nota }
    inimigo: []  // Mesma estrutura para o amigo inimigo
};

async function carregarDoBanco() {
    if (!URL_BANCO.startsWith("http")) return;
    try {
        const resposta = await fetch(`${URL_BANCO}/evento_v2.json`);
        const dados = await resposta.json();
        if (dados) {
            estadoEvento = {
                amigo: dados.amigo || [],
                inimigo: dados.inimigo || []
            };
        } else {
            estadoEvento = { amigo: [], inimigo: [] };
        }
        atualizarTela();
    } catch (erro) {
        console.error("Erro ao sincronizar:", erro);
    }
}

async function salvarNoBanco() {
    if (!URL_BANCO.startsWith("http")) return;
    try {
        await fetch(`${URL_BANCO}/evento_v2.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(estadoEvento)
        });
        atualizarTela();
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
    }
}

// =========================================================
// 3. REFERÊNCIAS DOS ELEMENTOS DO HTML
// =========================================================
const btnModo = document.getElementById("botao_MODO");
const btnCadastro = document.getElementById("botao_PIN");

const painelRegistro = document.getElementById("registro");
const inputPinCadastro = document.getElementById("input_PIN");
const inputQuemTirou = document.getElementById("QUEM-TIROU");
const inputPresente = document.getElementById("PRESENTE");
const selectNotaPresente = document.getElementById("NOTA_PRESENTE");
const btnValidarCadastro = document.getElementById("botao_VALIDAR");

const painelAdm = document.getElementById("PAINEL-ADM");
const btnNovoEvento = document.getElementById("novo-evento");

const tabelaCorpo = document.getElementById("tabela-corpo");

// =========================================================
// 4. BOTÃO DE ALTERNÂNCIA DE ESTADO (AMIGO / INIMIGO)
// =========================================================
if (btnModo) {
    btnModo.addEventListener("click", () => {
        modoAtual = (modoAtual === "amigo") ? "inimigo" : "amigo";
        btnModo.textContent = (modoAtual === "amigo") ? "MODO: AMIGO" : "MODO: INIMIGO";
        
        // Fecha painéis abertos ao trocar de modo para evitar confusão
        painelRegistro.classList.add("oculto");
        painelAdm.classList.add("oculto");
        
        atualizarTela();
    });
}

// =========================================================
// 5. ABERTURA DO PAINEL DE REGISTRO + VOTAÇÃO
// =========================================================
if (btnCadastro) {
    btnCadastro.addEventListener("click", () => {
        painelRegistro.classList.toggle("oculto");
        painelAdm.classList.add("oculto");
        if (!painelRegistro.classList.contains("oculto")) {
            inputPinCadastro.focus();
        }
    });
}

// =========================================================
// 6. REGRA DE REGISTRO UNIFICADO E BLOQUEIO DE DUPLICIDADE
// =========================================================
function normalizarTexto(texto) {
    return texto.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

if (btnValidarCadastro) {
    btnValidarCadastro.addEventListener("click", async () => {
        const pinDigitado = inputPinCadastro.value.trim();
        const presenteador = inputQuemTirou.value.trim();
        const presente = inputPresente.value.trim();
        const nota = selectNotaPresente ? Number(selectNotaPresente.value) : 5;

        const usuario = PARTICIPANTES.find(p => p.pin === pinDigitado);
        if (!usuario) {
            painelAdm.classList.add("oculto");
            inputPinCadastro.value = "";
            inputPinCadastro.focus();
            return;
        }

        // Ativa painel ADM se for o seu PIN
        if (usuario.admin) {
            painelAdm.classList.remove("oculto");
            if (!presenteador && !presente) {
                inputPinCadastro.value = "";
                painelRegistro.classList.add("oculto");
                return;
            }
        } else {
            painelAdm.classList.add("oculto");
        }

        if (!presenteador || !presente) return;

        // Puxa dados atualizados do Firebase antes de validar
        await carregarDoBanco();

        const listaDoModo = estadoEvento[modoAtual];

        // Trava 1: Esse PIN já registrou e votou neste modo (Amigo ou Inimigo)
        const avaliadorJaVotou = listaDoModo.some(r => r.pinAvaliador === pinDigitado);
        
        // Trava 2: Essa pessoa (presenteador) já foi avaliada neste modo (nunca vota 2x na mesma pessoa)
        const pessoaJaAvaliada = listaDoModo.some(
            r => normalizarTexto(r.presenteador) === normalizarTexto(presenteador)
        );

        // Trava 3: Impede votar em si mesmo
        const autoVoto = normalizarTexto(usuario.nome) === normalizarTexto(presenteador);

        if (avaliadorJaVotou || pessoaJaAvaliada || autoVoto) {
            inputPinCadastro.value = "";
            inputQuemTirou.value = "";
            inputPresente.value = "";
            painelRegistro.classList.add("oculto");
            return;
        }

        // Salva o registro + nota no modo ativo ("amigo" ou "inimigo")
        estadoEvento[modoAtual].push({
            pinAvaliador: usuario.pin,
            avaliador: usuario.nome,
            presenteador: presenteador,
            presente: presente,
            nota: nota
        });

        await salvarNoBanco();

        inputPinCadastro.value = "";
        inputQuemTirou.value = "";
        inputPresente.value = "";
        if (selectNotaPresente) selectNotaPresente.value = "5";
        painelRegistro.classList.add("oculto");
    });
}

// =========================================================
// 7. PAINEL ADMINISTRATIVO (ZERAR EVENTO)
// =========================================================
if (btnNovoEvento) {
    btnNovoEvento.addEventListener("click", async () => {
        const confirmar = confirm("Tem certeza que deseja zerar todo o evento (Amigo e Inimigo)?");
        if (confirmar) {
            estadoEvento = {
                amigo: [],
                inimigo: []
            };
            await salvarNoBanco();
        }
        painelAdm.classList.add("oculto");
    });
}

// =========================================================
// 8. NAVEGAÇÃO PELO TECLADO (TECLA ENTER)
// =========================================================
if (inputPinCadastro) {
    inputPinCadastro.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            inputQuemTirou.focus();
        }
    });
}

if (inputQuemTirou) {
    inputQuemTirou.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            inputPresente.focus();
        }
    });
}

if (inputPresente) {
    inputPresente.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectNotaPresente) {
                selectNotaPresente.focus();
            } else {
                btnValidarCadastro.click();
            }
        }
    });
}

if (selectNotaPresente) {
    selectNotaPresente.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            btnValidarCadastro.click();
        }
    });
}

// =========================================================
// 9. ATUALIZAÇÃO DO PÓDIO E TABELA CONFORME O MODO ATIVO
// =========================================================
function atualizarTela() {
    if (!tabelaCorpo) return;

    const listaDoModo = estadoEvento[modoAtual] || [];

    // Ordena do maior para o menor pela nota recebida
    const ranking = [...listaDoModo].sort((a, b) => b.nota - a.nota);

    const primeiro = document.querySelector(".DEGRAU_1 .nome");
    const segundo = document.querySelector(".DEGRAU_2 .nome");
    const terceiro = document.querySelector(".DEGRAU_3 .nome");

    if (primeiro) primeiro.textContent = ranking[0] ? `${ranking[0].presenteador} (${ranking[0].nota.toFixed(1)})` : "---";
    if (segundo) segundo.textContent = ranking[1] ? `${ranking[1].presenteador} (${ranking[1].nota.toFixed(1)})` : "---";
    if (terceiro) terceiro.textContent = ranking[2] ? `${ranking[2].presenteador} (${ranking[2].nota.toFixed(1)})` : "---";

    tabelaCorpo.innerHTML = "";
    ranking.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}º</td>
            <td>${item.presenteador}</td>
            <td>${item.avaliador}</td>
            <td>${item.presente}</td>
            <td>${item.nota.toFixed(1)}</td>
        `;
        tabelaCorpo.appendChild(tr);
    });
}

// Sincroniza ao abrir e atualiza a cada 4 segundos
carregarDoBanco();
setInterval(carregarDoBanco, 4000);