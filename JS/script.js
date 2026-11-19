// =========================================================
// URL DO SEU FIREBASE (SEM BARRA NO FINAL)
// =========================================================
const URL_BANCO = "https://site-oficial-paes-default-rtdb.firebaseio.com";

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
// 2. ESTADO DO EVENTO E SINCRONIZAÇÃO COM O FIREBASE
// =========================================================
let modoAtual = "amigo"; // "amigo" ou "inimigo"
let votanteAtual = null;

let estadoEvento = {
    amigo: [],   // { pin, nome, presenteado, presente, somaNotas, qtdVotos }
    inimigo: [], // { pin, nome, presenteado, presente, somaNotas, qtdVotos }
    votosDados: {
        amigo: {},   // Ex: { "0001": ["000X", "0010"] } -> PINs em quem Marcela já votou
        inimigo: {}
    }
};

async function carregarDoBanco() {
    try {
        const resposta = await fetch(`${URL_BANCO}/evento_v3.json`);
        const dados = await resposta.json();
        if (dados) {
            estadoEvento = {
                amigo: dados.amigo || [],
                inimigo: dados.inimigo || [],
                votosDados: {
                    amigo: (dados.votosDados && dados.votosDados.amigo) || {},
                    inimigo: (dados.votosDados && dados.votosDados.inimigo) || {}
                }
            };
        } else {
            estadoEvento = { amigo: [], inimigo: [], votosDados: { amigo: {}, inimigo: {} } };
        }
        atualizarTela();
    } catch (erro) {
        console.error("Erro ao sincronizar:", erro);
    }
}

async function salvarNoBanco() {
    try {
        await fetch(`${URL_BANCO}/evento_v3.json`, {
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
const btnCadastro = document.getElementById("botao_PIN");
const btnVotar = document.getElementById("botao_VOTAR");

const painelRegistro = document.getElementById("registro");
const inputPinCadastro = document.getElementById("input_PIN");
const inputQuemTirou = document.getElementById("QUEM-TIROU");
const inputPresente = document.getElementById("PRESENTE");
const inputQuemInimigo = document.getElementById("QUEM-INIMIGO");
const inputPresenteInimigo = document.getElementById("PRESENTE-INIMIGO");
const btnValidarCadastro = document.getElementById("botao_VALIDAR");

const painelVotacao = document.getElementById("PAINEL-VOTACAO");
const inputPinVoto = document.getElementById("PIN_VOTO");
const btnAcessarLista = document.getElementById("botao_ENTRAR_VOTO");
const divListaPresentes = document.getElementById("LISTA-PRESENTES");
const btnConfirmarVotos = document.getElementById("botao_VOTAR_CONFIRMAR");

const painelAdm = document.getElementById("PAINEL-ADM");
const btnNovoEvento = document.getElementById("novo-evento");

const switchModo = document.getElementById("modo-selector");
const secaoPodio = document.getElementById("PODIO");
const secaoClassificacao = document.getElementById("CLASSIFICACAO");
const colunaModo = document.getElementById("coluna-modo");
const tabelaCorpo = document.getElementById("tabela-corpo");

// Garante que o botão VOTAR funcione em tempo integral
if (btnVotar) btnVotar.disabled = false;

// =========================================================
// 4. SWITCH DE MODO (AMIGO / INIMIGO)
// =========================================================
if (switchModo) {
    switchModo.addEventListener("change", () => {
        modoAtual = switchModo.checked ? "inimigo" : "amigo";

        // Aplica ou remove o tema mais escuro no Pódio e na Tabela
        if (modoAtual === "inimigo") {
            secaoPodio.classList.add("modo-inimigo");
            secaoClassificacao.classList.add("modo-inimigo");
            if (colunaModo) colunaModo.textContent = "Inimigo";
        } else {
            secaoPodio.classList.remove("modo-inimigo");
            secaoClassificacao.classList.remove("modo-inimigo");
            if (colunaModo) colunaModo.textContent = "Amigo";
        }

        // Se o painel de votação estiver aberto para alguém, atualiza a lista na hora
        if (!painelVotacao.classList.contains("oculto") && votanteAtual) {
            montarListaDeVotacao(votanteAtual.pin);
        }

        atualizarTela();
    });
}

// =========================================================
// 5. ABERTURA DOS PAINÉIS PRINCIPAIS
// =========================================================
if (btnCadastro) {
    btnCadastro.addEventListener("click", () => {
        painelRegistro.classList.toggle("oculto");
        painelVotacao.classList.add("oculto");
        painelAdm.classList.add("oculto");
        if (!painelRegistro.classList.contains("oculto")) {
            inputPinCadastro.focus();
        }
    });
}

if (btnVotar) {
    btnVotar.addEventListener("click", () => {
        painelVotacao.classList.toggle("oculto");
        painelRegistro.classList.add("oculto");
        painelAdm.classList.add("oculto");
        divListaPresentes.innerHTML = "";
        btnConfirmarVotos.classList.add("oculto");
        votanteAtual = null;
        if (!painelVotacao.classList.contains("oculto")) {
            inputPinVoto.focus();
        }
    });
}

// =========================================================
// 6. REGISTRO DE AMIGO E INIMIGO + ATIVAÇÃO DO ADM
// =========================================================
if (btnValidarCadastro) {
    btnValidarCadastro.addEventListener("click", async () => {
        const pinDigitado = inputPinCadastro.value.trim();
        const amigo = inputQuemTirou.value.trim();
        const presenteAmigo = inputPresente.value.trim();
        const inimigo = inputQuemInimigo ? inputQuemInimigo.value.trim() : "";
        const presenteInimigo = inputPresenteInimigo ? inputPresenteInimigo.value.trim() : "";

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
            if (!amigo && !presenteAmigo && !inimigo && !presenteInimigo) {
                inputPinCadastro.value = "";
                painelRegistro.classList.add("oculto");
                return;
            }
        } else {
            painelAdm.classList.add("oculto");
        }

        if (!amigo || !presenteAmigo || !inimigo || !presenteInimigo) return;

        await carregarDoBanco();

        // Impede cadastro duplicado do mesmo PIN
        const jaCadastrado = estadoEvento.amigo.some(r => r.pin === pinDigitado);
        if (jaCadastrado) {
            limparCamposCadastro();
            return;
        }

        estadoEvento.amigo.push({
            pin: usuario.pin,
            nome: usuario.nome,
            presenteado: amigo,
            presente: presenteAmigo,
            somaNotas: 0,
            qtdVotos: 0
        });

        estadoEvento.inimigo.push({
            pin: usuario.pin,
            nome: usuario.nome,
            presenteado: inimigo,
            presente: presenteInimigo,
            somaNotas: 0,
            qtdVotos: 0
        });

        await salvarNoBanco();
        limparCamposCadastro();
    });
}

function limparCamposCadastro() {
    inputPinCadastro.value = "";
    inputQuemTirou.value = "";
    inputPresente.value = "";
    if (inputQuemInimigo) inputQuemInimigo.value = "";
    if (inputPresenteInimigo) inputPresenteInimigo.value = "";
    painelRegistro.classList.add("oculto");
}

// =========================================================
// 7. VOTAÇÃO INCREMENTAL OU EM LOTE (SEM REPETIR PESSOA)
// =========================================================
if (btnAcessarLista) {
    btnAcessarLista.addEventListener("click", async () => {
        const pinDigitado = inputPinVoto.value.trim();
        const usuario = PARTICIPANTES.find(p => p.pin === pinDigitado);

        if (!usuario) {
            painelAdm.classList.add("oculto");
            inputPinVoto.value = "";
            inputPinVoto.focus();
            return;
        }

        if (usuario.admin) {
            painelAdm.classList.remove("oculto");
        } else {
            painelAdm.classList.add("oculto");
        }

        await carregarDoBanco();
        votanteAtual = usuario;
        montarListaDeVotacao(usuario.pin);
    });
}

function montarListaDeVotacao(pinDoVotante) {
    divListaPresentes.innerHTML = "";

    const listaDoModo = estadoEvento[modoAtual] || [];
    const jaVotadosPorEstePin = estadoEvento.votosDados[modoAtual][pinDoVotante] || [];

    // Filtra: remove o próprio presente do votante E remove quem ele já votou antes
    const disponiveisParaVotar = listaDoModo.filter(
        item => item.pin !== pinDoVotante && !jaVotadosPorEstePin.includes(item.pin)
    );

    if (disponiveisParaVotar.length === 0) {
        divListaPresentes.innerHTML = `<p>Nenhum presente pendente para você votar no modo <strong>${modoAtual.toUpperCase()}</strong>.</p>`;
        btnConfirmarVotos.classList.add("oculto");
        return;
    }

    disponiveisParaVotar.forEach(item => {
        const card = document.createElement("div");
        card.style.borderBottom = "1px solid #DB9C31";
        card.style.padding = "10px 0";
        card.style.textAlign = "left";

        card.innerHTML = `
            <p><strong>${item.nome}</strong> deu <strong>${item.presente}</strong> para <em>${item.presenteado}</em></p>
            <label>Avaliar: 
                <select class="select-nota" data-pin-alvo="${item.pin}">
                    <option value="">Pular por enquanto</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                </select>
            </label>
        `;
        divListaPresentes.appendChild(card);
    });

    btnConfirmarVotos.classList.remove("oculto");
}

if (btnConfirmarVotos) {
    btnConfirmarVotos.addEventListener("click", async () => {
        if (!votanteAtual) return;

        // Pega apenas os selects onde a pessoa escolheu uma nota (não deixou em "Pular")
        const votosEscolhidos = [];
        document.querySelectorAll(".select-nota").forEach(select => {
            if (select.value !== "") {
                votosEscolhidos.push({
                    pinAlvo: select.getAttribute("data-pin-alvo"),
                    nota: Number(select.value)
                });
            }
        });

        if (votosEscolhidos.length === 0) return;

        await carregarDoBanco();

        if (!estadoEvento.votosDados[modoAtual][votanteAtual.pin]) {
            estadoEvento.votosDados[modoAtual][votanteAtual.pin] = [];
        }

        const jaVotados = estadoEvento.votosDados[modoAtual][votanteAtual.pin];

        votosEscolhidos.forEach(voto => {
            // Garantia dupla: nunca computa se já votou nessa pessoa antes
            if (!jaVotados.includes(voto.pinAlvo)) {
                const registroAlvo = estadoEvento[modoAtual].find(r => r.pin === voto.pinAlvo);
                if (registroAlvo) {
                    registroAlvo.somaNotas += voto.nota;
                    registroAlvo.qtdVotos += 1;
                    jaVotados.push(voto.pinAlvo);
                }
            }
        });

        await salvarNoBanco();

        // Fecha silenciosamente sem abrir caixas de diálogo
        inputPinVoto.value = "";
        divListaPresentes.innerHTML = "";
        btnConfirmarVotos.classList.add("oculto");
        painelVotacao.classList.add("oculto");
        painelAdm.classList.add("oculto");
        votanteAtual = null;
    });
}

// =========================================================
// 8. PAINEL ADM (ZERAR EVENTO)
// =========================================================
if (btnNovoEvento) {
    btnNovoEvento.addEventListener("click", async () => {
        estadoEvento = {
            amigo: [],
            inimigo: [],
            votosDados: { amigo: {}, inimigo: {} }
        };
        await salvarNoBanco();
        painelAdm.classList.add("oculto");
    });
}

// =========================================================
// 9. ATUALIZAÇÃO DO PÓDIO E TABELA
// =========================================================
function atualizarTela() {
    if (!tabelaCorpo) return;

    const listaDoModo = estadoEvento[modoAtual] || [];

    const ranking = [...listaDoModo].map(item => {
        const media = item.qtdVotos > 0 ? (item.somaNotas / item.qtdVotos) : 0;
        return { ...item, media };
    }).sort((a, b) => b.media - a.media);

    const primeiro = document.querySelector(".DEGRAU_1 .nome");
    const segundo = document.querySelector(".DEGRAU_2 .nome");
    const terceiro = document.querySelector(".DEGRAU_3 .nome");

    if (primeiro) primeiro.textContent = ranking[0] ? `${ranking[0].nome} (${ranking[0].media.toFixed(1)})` : "---";
    if (segundo) segundo.textContent = ranking[1] ? `${ranking[1].nome} (${ranking[1].media.toFixed(1)})` : "---";
    if (terceiro) terceiro.textContent = ranking[2] ? `${ranking[2].nome} (${ranking[2].media.toFixed(1)})` : "---";

    tabelaCorpo.innerHTML = "";
    ranking.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}º</td>
            <td>${item.nome}</td>
            <td>${item.presenteado}</td>
            <td>${item.presente}</td>
            <td>${item.media.toFixed(1)}</td>
        `;
        tabelaCorpo.appendChild(tr);
    });
}

// Sincroniza ao abrir e a cada 4 segundos
carregarDoBanco();
setInterval(carregarDoBanco, 4000);