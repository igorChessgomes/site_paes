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
// 2. MEMÓRIA DINÂMICA DO EVENTO (Salva no navegador)
// =========================================================
let estadoEvento = JSON.parse(localStorage.getItem("amigoOcultoPaes")) || {
    registros: [],            // Guarda { pin, nome, presenteado, presente, somaNotas, qtdVotos }
    votantesConfirmados: [],  // Guarda os PINs de quem já travou o voto
    liberadoManualmente: false
};

function salvarEstado() {
    localStorage.setItem("amigoOcultoPaes", JSON.stringify(estadoEvento));
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
const btnValidarCadastro = document.getElementById("botao_VALIDAR");

const painelVotacao = document.getElementById("PAINEL-VOTACAO");
const inputPinVoto = document.getElementById("PIN_VOTO");
const btnAcessarLista = document.getElementById("botao_ENTRAR_VOTO");
const divListaPresentes = document.getElementById("LISTA-PRESENTES");
const btnConfirmarVotos = document.getElementById("botao_VOTAR_CONFIRMAR");

const painelAdm = document.getElementById("PAINEL-ADM");
const btnLiberarVoto = document.getElementById("liberar-voto");
const btnNovoEvento = document.getElementById("novo-evento");

const tabelaCorpo = document.getElementById("tabela-corpo");

// =========================================================
// 4. CONTROLE DE ABERTURA DOS PAINÉIS PRINCIPAIS
// =========================================================
btnCadastro.addEventListener("click", () => {
    painelRegistro.classList.toggle("oculto");
    painelVotacao.classList.add("oculto");
    painelAdm.classList.add("oculto"); // Garante que o ADM suma ao alternar
    if (!painelRegistro.classList.contains("oculto")) {
        inputPinCadastro.focus();
    }
});

btnVotar.addEventListener("click", () => {
    painelVotacao.classList.toggle("oculto");
    painelRegistro.classList.add("oculto");
    painelAdm.classList.add("oculto"); // Garante que o ADM suma ao alternar
    divListaPresentes.innerHTML = "";
    btnConfirmarVotos.classList.add("oculto");
    if (!painelVotacao.classList.contains("oculto")) {
        inputPinVoto.focus();
    }
});

// =========================================================
// 5. REGRA DE CADASTRO E ATIVAÇÃO DO PAINEL ADM
// =========================================================
btnValidarCadastro.addEventListener("click", () => {
    const pinDigitado = inputPinCadastro.value.trim();
    const presenteado = inputQuemTirou.value.trim();
    const presente = inputPresente.value.trim();

    const usuario = PARTICIPANTES.find(p => p.pin === pinDigitado);
    if (!usuario) {
        painelAdm.classList.add("oculto");
        inputPinCadastro.value = "";
        inputPinCadastro.focus();
        return;
    }

    // Controla visibilidade do ADM estritamente pelo usuário atual
    if (usuario.admin) {
        painelAdm.classList.remove("oculto");
        if (!presenteado && !presente) {
            inputPinCadastro.value = "";
            painelRegistro.classList.add("oculto");
            return;
        }
    } else {
        painelAdm.classList.add("oculto");
    }

    if (!presenteado || !presente) return;

    // Impede duplicidade silenciosamente e fecha o painel
    const jaCadastrado = estadoEvento.registros.some(r => r.pin === pinDigitado);
    if (jaCadastrado) {
        inputPinCadastro.value = "";
        inputQuemTirou.value = "";
        inputPresente.value = "";
        painelRegistro.classList.add("oculto");
        return;
    }

    // Salva o novo registro e atualiza a tela mantendo a posição atual
    estadoEvento.registros.push({
        pin: usuario.pin,
        nome: usuario.nome,
        presenteado: presenteado,
        presente: presente,
        somaNotas: 0,
        qtdVotos: 0
    });

    salvarEstado();
    atualizarTela();

    inputPinCadastro.value = "";
    inputQuemTirou.value = "";
    inputPresente.value = "";
    painelRegistro.classList.add("oculto");
});

// =========================================================
// 6. REGRA DE VOTAÇÃO E TRAVA DEFINITIVA
// =========================================================
let votanteAtual = null;

btnAcessarLista.addEventListener("click", () => {
    const pinDigitado = inputPinVoto.value.trim();
    const usuario = PARTICIPANTES.find(p => p.pin === pinDigitado);

    if (!usuario) {
        painelAdm.classList.add("oculto");
        inputPinVoto.value = "";
        inputPinVoto.focus();
        return;
    }

    // Só mostra ADM se for o seu PIN; se for outro convidado, esconde
    if (usuario.admin) {
        painelAdm.classList.remove("oculto");
    } else {
        painelAdm.classList.add("oculto");
    }

    if (estadoEvento.votantesConfirmados.includes(pinDigitado)) {
        inputPinVoto.value = "";
        divListaPresentes.innerHTML = "<p>Seu voto já foi registrado e travado.</p>";
        btnConfirmarVotos.classList.add("oculto");
        return;
    }

    votanteAtual = usuario;
    montarListaDeVotacao(usuario.pin);
});

function montarListaDeVotacao(pinDoVotante) {
    divListaPresentes.innerHTML = "";

    const presentesParaVotar = estadoEvento.registros.filter(r => r.pin !== pinDoVotante);

    if (presentesParaVotar.length === 0) {
        divListaPresentes.innerHTML = "<p>Nenhum outro presente cadastrado ainda.</p>";
        return;
    }

    presentesParaVotar.forEach(item => {
        const card = document.createElement("div");
        card.style.borderBottom = "1px solid #ddd";
        card.style.padding = "10px 0";
        card.style.textAlign = "left";

        card.innerHTML = `
            <p><strong>${item.nome}</strong> deu <strong>${item.presente}</strong> para <em>${item.presenteado}</em></p>
            <label>Nota (1 a 5): 
                <select class="select-nota" data-pin-alvo="${item.pin}">
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

btnConfirmarVotos.addEventListener("click", () => {
    if (!votanteAtual) return;

    const certeza = confirm(`${votanteAtual.nome}, tem certeza das suas notas? Após confirmar, seu voto será travado.`);
    if (!certeza) return;

    const selects = document.querySelectorAll(".select-nota");

    selects.forEach(select => {
        const pinAlvo = select.getAttribute("data-pin-alvo");
        const notaEscolhida = Number(select.value);

        const registroAlvo = estadoEvento.registros.find(r => r.pin === pinAlvo);
        if (registroAlvo) {
            registroAlvo.somaNotas += notaEscolhida;
            registroAlvo.qtdVotos += 1;
        }
    });

    estadoEvento.votantesConfirmados.push(votanteAtual.pin);
    salvarEstado();
    atualizarTela();

    inputPinVoto.value = "";
    divListaPresentes.innerHTML = "";
    btnConfirmarVotos.classList.add("oculto");
    painelVotacao.classList.add("oculto");
    painelAdm.classList.add("oculto");
    votanteAtual = null;
});

// =========================================================
// 7. BOTÕES DO PAINEL ADMINISTRATIVO (AUTO-FECHAMENTO)
// =========================================================
btnLiberarVoto.addEventListener("click", () => {
    estadoEvento.liberadoManualmente = true;
    salvarEstado();
    atualizarTela();
    painelAdm.classList.add("oculto"); // Volta ao estado inicial sem ADM
});

btnNovoEvento.addEventListener("click", () => {
    const confirmar = confirm("Tem certeza que deseja zerar todo o evento?");
    if (confirmar) {
        estadoEvento = {
            registros: [],
            votantesConfirmados: [],
            liberadoManualmente: false
        };
        salvarEstado();
        atualizarTela();
    }
    painelAdm.classList.add("oculto"); // Volta ao estado inicial sem ADM
});

// =========================================================
// 8. NAVEGAÇÃO PELO TECLADO (TECLA ENTER)
// =========================================================
inputPinCadastro.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        // Se for o seu PIN e os outros campos estiverem vazios, já valida para abrir o ADM direto
        if (inputPinCadastro.value.trim() === "0000" && !inputQuemTirou.value.trim()) {
            inputQuemTirou.focus();
        } else {
            inputQuemTirou.focus();
        }
    }
});

inputQuemTirou.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        inputPresente.focus();
    }
});

inputPresente.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        btnValidarCadastro.click();
    }
});

inputPinVoto.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        btnAcessarLista.click();
    }
});

// =========================================================
// 9. ATUALIZAÇÃO SILENCIOSA DO BOTÃO VOTAR, PÓDIO E TABELA
// =========================================================
function atualizarTela() {
    const todosCadastraram = estadoEvento.registros.length >= PARTICIPANTES.length;
    btnVotar.disabled = !(todosCadastraram || estadoEvento.liberadoManualmente);

    const ranking = [...estadoEvento.registros].map(item => {
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

atualizarTela();