package cases

import (
	"casos-de-codigo/internal/core"
	"casos-de-codigo/internal/db"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"unicode"
)

type Case1 struct{}

func (c *Case1) GetID() string {
	return "caso_1"
}

func (c *Case1) GetLoadNarrative(puzzleState int) string {
	switch puzzleState {
	case 1:
		return `21:47. A sala de Marcos está fria.

A única luz vem do brilho esverdeado do seu terminal portátil e do monitor da vítima, que pulsa com uma única mensagem:

ACESSO BLOQUEADO.

Seu primeiro caso oficial no DITEC. E tinha que ser logo o de Marcos, o DBA Chefe. O melhor analista que a agência tinha.

A perícia já foi. Levaram o corpo, mas a sala ainda cheira a café frio e ao ozônio fraco dos servidores ligados.

O computador dele é a chave, mas as perguntas de segurança são pessoais, quase íntimas. 'Qual o nome da sua primeira gata?' 'Bebida favorita do seu melhor amigo?'

Você precisa de contexto. Você olha ao redor da mesa dele. Manuais de banco de dados, uma caneca lascada... e, à sua direita, um grande quadro de cortiça. Está coberto de fotos de viagens, post-its e o que parecem ser anotações de um... jogo de lógica?

Um vislumbre da vida pessoal de Marcos. Um bom lugar para começar.

Tente o comando: OLHAR QUADRO`

	case 2:
		return `Você está de volta à sala de Marcos. O computador dele está destravado, a tela brilhando com seus e-mails e queries inacabadas.
Mas sua atenção não está ali. O <i>clique</i> baixo, mas distinto, que você ouviu da direção da <strong>estante</strong> de livros ecoa na sala silenciosa.
Um mecanismo... O que Marcos esconderia ali?`

	case 3:
		return `Você olha para o seu terminal. O pendrive que você encontrou na estante está conectado.
Como esperado, está criptografado e pedindo uma senha.
    
Felizmente, há um arquivo 'anotacoes.txt' visível:
'Marcos salvou a senha da forma mais estúpida. É o nome de um de seus projetos, mas ele usou 'leet speak' (A=4, E=3) e adicionou algum lixo no final da string. A senha correta é o nome do projeto, limpo e em maiúsculas.'
    
Você precisa descobrir qual projeto é. As tabelas 'senhas_codificadas' (para ver a string suja) e 'projetos' (para ver os nomes dos projetos) são seus pontos de partida.`

	case 4:
		return `Acesso concedido. A lista de funcionários do DITEC preenche sua tela. Nomes, cargos, projetos... Centenas de entradas.
É um começo, mas é vago. Você precisa de algo para filtrar.
Sua mente volta para a sala do crime, para a fita zebrada no chão. A primeira prova real... estava com a vítima.
É hora de olhar o <strong>corpo</strong>.`

	case 5:
		return `Três nomes. Sua lista de suspeitos está na tela: Maria, Pedro, Ana. Todos loiros.
É um filtro, mas não é o suficiente. Você precisa de mais uma prova física para reduzir isso.
Você se levanta e anda pela sala... seus olhos param no <strong>chão</strong>, perto da porta. A luz do corredor revela uma marca escura, quase invisível. Uma pegada.`

	case 6:
		return `A lista encolheu de novo. Agora são dois: Pedro e Ana. Ambos loiros, ambos calçam 42. Um beco sem saída.
Você passa a mão pelo rosto, frustrado, e se joga no <strong>sofá</strong> velho de Marcos. Sua mão amassa um jornal velho.
Você o puxa. 'Gazeta da Cidade'. E uma reportagem circulada em vermelho...`

	case 7:
		return `CASO FECHADO.
O relatório foi enviado. A sala de Marcos está silenciosa novamente.
Você pode recomeçar o caso digitando 'reset'.`

	default:
		return "Estado do jogo desconhecido. Recarregando caso...\n\n" + c.GetLoadNarrative(1)
	}
}

func (c *Case1) GetSchema() string {
	return `
-- MUDANÇA: Tabela de Estado agora suporta INT (puzzle) e TEXT (foco)
CREATE TABLE IF NOT EXISTS player_state (
    key TEXT PRIMARY KEY, 
    value INTEGER,
    value_text TEXT 
);
INSERT OR IGNORE INTO player_state (key, value) VALUES ('current_puzzle', 1);
INSERT OR IGNORE INTO player_state (key, value_text) VALUES ('current_focus', 'none');

-- (O resto do seu schema.sql... pistas_logicas, livros, etc... permanece o MESMO)

CREATE TABLE IF NOT EXISTS pistas_logicas (
    posicao INTEGER PRIMARY KEY,
    nome TEXT, casa TEXT, bebida TEXT, profissao TEXT, animal TEXT
);
INSERT OR IGNORE INTO pistas_logicas (posicao) VALUES (1), (2), (3), (4);

CREATE TABLE IF NOT EXISTS livros (
    id INTEGER PRIMARY KEY,
    titulo TEXT NOT NULL, 
    ano INTEGER,
    posicao INTEGER UNIQUE CHECK(posicao IS NULL OR (posicao >= 1 AND posicao <= 5))
);
INSERT OR IGNORE INTO livros (id, titulo, ano, posicao) VALUES
(1, 'O Guia do DBA', 2010, 2),
(2, 'SQL para Leigos', 2015, 3),
(3, 'A Vingança dos Dados', 2018, 5),
(4, 'Redes e Conflitos', 2012, 1),
(5, 'O Código da Meia-Noite', 2021, 4);

CREATE TABLE IF NOT EXISTS senhas_codificadas (
    id INTEGER PRIMARY KEY, senha TEXT NOT NULL
);
INSERT OR IGNORE INTO senhas_codificadas (id, senha) VALUES (1, 'p4n-t3rA-extra');

CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL, sobrenome TEXT NOT NULL,
    cabelo TEXT, pe INTEGER
);
INSERT OR IGNORE INTO funcionarios (id, nome, sobrenome, cabelo, pe) VALUES
(1, 'Lucas', 'Silva', 'castanho', 42),
(2, 'Maria', 'Santos', 'loiro', 38),
(3, 'Felipe', 'Oliveira', 'preto', 44),
(4, 'Pedro', 'Queiroz', 'loiro', 42),
(5, 'Ana', 'Costa', 'loiro', 42);

CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY, nome TEXT NOT NULL
);
INSERT OR IGNORE INTO projetos (id, nome) VALUES (1, 'Projeto PANTERA'), (2, 'Projeto FÊNIX');

CREATE TABLE IF NOT EXISTS projetos_funcionarios (
    id INTEGER PRIMARY KEY,
    func_id INTEGER, proj_id INTEGER
);
INSERT OR IGNORE INTO projetos_funcionarios (func_id, proj_id) VALUES
(1, 1), (2, 2), (3, 2), (4, 1),
(5, 2);

CREATE TABLE IF NOT EXISTS suspeitos (
    id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS opcoes (
    categoria TEXT NOT NULL,
    valor TEXT NOT NULL,
    PRIMARY KEY (categoria, valor)
);
INSERT OR IGNORE INTO opcoes (categoria, valor) VALUES
('nome', 'Pedro'), ('nome', 'Joana'), ('nome', 'Mariana'), ('nome', 'Rafaela'),
('casa', 'Vermelha'), ('casa', 'Azul'), ('casa', 'Verde'), ('casa', 'Amarela'),
('bebida', 'Café'), ('bebida', 'Chá'), ('bebida', 'Água'), ('bebida', 'Suco'),
('profissao', 'Advocacia'), ('profissao', 'Arquitetura'), ('profissao', 'Medicina'), ('profissao', 'Estilismo'),
('animal', 'Gato'), ('animal', 'Cachorro'), ('animal', 'Peixe'), ('animal', 'Papagaio');
`
}

func (c *Case1) ProcessCommand(command string, dbm *db.DBManager, puzzleState int, currentFocus string) (core.GameResponse, int, string) {
	trimmedCommand := strings.TrimSpace(command)
	upperCommand := strings.ToUpper(trimmedCommand)

	if !isSQL(trimmedCommand) {
		return c.handleGameCommand(trimmedCommand, dbm, puzzleState, currentFocus)
	}

	if strings.HasPrefix(upperCommand, "SELECT") {
		return c.handleSelectQuery(trimmedCommand, dbm, puzzleState, currentFocus)
	} else {
		return c.handleExecStatement(trimmedCommand, dbm, puzzleState, currentFocus)
	}
}

func (c *Case1) getHelp(puzzleState int) core.GameResponse {
	helpText := `
Comandos de Jogo Disponíveis:
- AJUDA: Mostra esta mensagem.
- OLHAR [NOME]: Interage com um objeto da sala (QUADRO, ESTANTE, COMPUTADOR, CORPO, CHÃO, SOFÁ).
- LIMPAR (ou CLS): Limpa a tela.
- RESET: Reinicia o caso (pedirá confirmação).

Comandos SQL:
- SELECT, UPDATE, INSERT, DELETE

---
`

	switch puzzleState {
	case 1:
		helpText += "Tabelas Relevantes (Puzzle 1):\n- pistas_logicas (a tabela principal do puzzle)\n- opcoes (para ver as categorias)"
	case 2:
		helpText += "Tabelas Relevantes (Puzzle 2):\n- livros"
	case 3:
		helpText += "Tabelas Relevantes (Puzzle 3):\n- senhas_codificadas\n- projetos"
	case 4:
		helpText += "Tabelas Relevantes (Puzzle 4):\n- funcionarios\n- suspeitos"
	case 5:
		helpText += "Tabelas Relevantes (Puzzle 5):\n- funcionarios\n- suspeitos"
	case 6:
		helpText += "Tabelas Relevantes (Puzzle 6):\n- suspeitos\n- funcionarios\n- projetos_funcionarios\n- projetos"
	default:
		helpText += "Nenhuma tabela de puzzle ativa no momento."
	}

	return core.GameResponse{Narrative: helpText}
}

func (c *Case1) handleGameCommand(command string, dbm *db.DBManager, puzzleState int, currentFocus string) (core.GameResponse, int, string) {
	upperCommand := strings.ToUpper(command)
	newFocus := currentFocus

	switch upperCommand {
	case "AJUDA", "HELP", "/AJUDA", "/HELP":
		return c.getHelp(puzzleState), puzzleState, currentFocus

	case "SAIR", "FECHAR", "PARAR DE OLHAR":
		if currentFocus == "none" {
			return core.GameResponse{Narrative: "Você não está focado em nada."}, puzzleState, "none"
		}
		narrative := fmt.Sprintf("Você para de examinar %s.", currentFocus)
		return core.GameResponse{Narrative: narrative}, puzzleState, "none"

	case "OLHAR QUADRO":
		if puzzleState != 1 {
			return core.GameResponse{Narrative: "Você já resolveu o quebra-cabeça. As anotações de Marcos não fazem mais sentido."}, puzzleState, currentFocus
		}
		newFocus = "quadro"
		narrative := `
Interessante. Em meio às fotos de férias e post-its antigos, Marcos estava no meio de um... quebra-cabeça de lógica. Um clássico.
Quatro casas enfileiradas, numeradas de 1 a 4. A tabela principal do jogo, 'pistas_logicas', está vazia no monitor. Pronta para ser preenchida.

As pistas estão todas aqui, anotadas em pedaços de papel:

(Pistas)
1. A casa Verde fica imediatamente à esquerda da casa Azul.
2. A única médica mora na terceira casa da rua.
3. Pedro mora na casa Vermelha, que fica em uma das pontas da rua.
4. Quem trabalha com Estilismo tem um Cachorro.
5. Na casa Verde, o morador sempre toma Chá.
6. O dono do Gato mora exatamente ao lado de quem tem um Papagaio.
7. A casa Vermelha é vizinha imediata da casa Verde.
8. Rafaela é médica e é a única que bebe Café.
9. Mariana mora na casa Amarela.
10. Quem trabalha com Advocacia cria um Peixe.
11. Mariana trabalha com Estilismo.
12. Quem bebe Chá é dono de um Gato.
13. Quem bebe Água é dono de um Peixe.

Mas... e as categorias? Os nomes, as profissões... Conhecendo o Marcos, ele não as deixaria soltas.
Um DBA de verdade armazena dados de forma estruturada. Ele deve ter criado tabelas de consulta para o 'universo' do jogo.
Vou precisar consultar o banco para ver todas as opções disponíveis. Talvez uma tabela 'opcoes'?
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	case "OLHAR ESTANTE":
		if puzzleState < 2 {
			return core.GameResponse{Narrative: "Uma estante de livros normal. Manuais de DBA, alguns romances de fantasia. Nada parece fora do lugar."}, puzzleState, currentFocus
		}
		if puzzleState > 2 {
			return core.GameResponse{Narrative: "Você olha para a estante. O compartimento secreto que você abriu está vazio. Os outros livros são apenas... livros."}, puzzleState, currentFocus
		}
		newFocus = "estante"
		narrative := `
Você se aproxima da estante. Vários livros de Marcos.
'O Guia do DBA', 'Redes e Conflitos', 'SQL para Leigos', 'A Vingança dos Dados', 'O Código da Meia-Noite'.
Estão todos visivelmente fora de ordem na prateleira.

Conhecendo o Marcos, ele não deixaria assim por acaso. Ele era metódico.
Deve haver alguma ordem escondida.

Vou consultar a tabela 'livros' para ver os metadados.
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	case "OLHAR COMPUTADOR":
		if puzzleState < 2 {
			return core.GameResponse{Narrative: "O computador está bloqueado. A tela pisca 'ACESSO BLOQUEADO' em um loop irritante."}, puzzleState, currentFocus
		}
		newFocus = "computador"
		narrative := `
Com o computador de Marcos destravado, você começa a investigar.

O papel de parede é uma foto de um gato malhado laranja, dormindo em cima de um rack de servidor antigo. Típico dele.

O cliente de e-mail está aberto. Assuntos padrão do DITEC: 'RE: Atualização do Servidor de Staging', 'Lembrete: Reunião de Sincronia', 'Status do Backup Noturno'. Nada fora do comum.

Ele tem um editor de SQL aberto com uma query complexa pela metade, cheia de JOINs e HINTs. Ele estava no meio de um 'deep dive' em algum problema de performance.

Tudo parece... normal. Trabalho, trabalho e mais trabalho.

Se Marcos tinha segredos, ele não os guardava no drive principal. Ele era um DBA paranoico demais para isso. Deve haver um dispositivo externo.
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	case "OLHAR CORPO":
		if puzzleState < 4 {
			return core.GameResponse{Narrative: "A área do corpo ainda está isolada. A perícia está terminando o trabalho. Melhor não contaminar a cena."}, puzzleState, currentFocus
		}
		if puzzleState > 4 {
			return core.GameResponse{Narrative: "O corpo de Marcos já foi removido. Só resta o contorno de fita no chão. Você se lembra do fio de cabelo loiro que encontrou."}, puzzleState, currentFocus
		}
		newFocus = "corpo"
		narrative := `
Você se agacha ao lado de onde Marcos... caiu. A perícia já fez o trabalho principal. O cheiro de produtos químicos de limpeza de sangue ainda está no ar.
Mas eles perderam algo.

Fechada na mão esquerda da vítima, uma pequena mecha de cabelo. Loiro, tingido e comprido. Não é dele.

É a nossa primeira pista real. Preciso cruzar isso com a lista de funcionários.
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	case "OLHAR CHÃO":
		if puzzleState < 5 {
			return core.GameResponse{Narrative: "Chão empoeirado, exceto pela área onde o corpo estava. Nenhum detalhe visível."}, puzzleState, currentFocus
		}
		if puzzleState > 5 {
			return core.GameResponse{Narrative: "A perícia já marcou o contorno da pegada tamanho 42 no chão."}, puzzleState, currentFocus
		}
		newFocus = "chao"
		narrative := `
A iluminação da sala é péssima, mas perto da porta, o reflexo do corredor mostra.
Uma pegada parcial no que restou da poça de sangue. O agressor pisou nela ao sair.

Não está completa, mas o padrão do calcanhar e a largura são claros. Eu calço 43, e esta é visivelmente menor.
A perícia acabou de ligar: a estimativa é tamanho 42.

Isso deve reduzir a lista de suspeitos.
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	case "OLHAR SOFÁ":
		if puzzleState < 6 {
			return core.GameResponse{Narrative: "Um sofá de escritório velho, com o couro sintético rachado. Parece que Marcos o usava mais para guardar casacos do que para sentar."}, puzzleState, currentFocus
		}
		if puzzleState > 6 {
			return core.GameResponse{Narrative: "O jornal sobre o Projeto PANTERA ainda está sobre o sofá."}, puzzleState, currentFocus
		}
		newFocus = "sofa"
		narrative := `
Quase o ignorei. Mas tem um jornal dobrado jogado sobre ele. 'Gazeta da Cidade'.
Uma reportagem na página 3 está circulada em caneta vermelha:

'VAZAMENTO QUÍMICO NO PROJETO PANTERA AMEAÇA INSTALAÇÕES.'

O nome me dá um arrepio. 'PANTERA'.
É o mesmo produto químico raro que o legista encontrou na lâmina...

O assassino tinha acesso a ele.
`
		return core.GameResponse{Narrative: narrative}, puzzleState, newFocus

	default:
		return core.GameResponse{Narrative: "Comando não reconhecido: " + command}, puzzleState, currentFocus
	}
}

func (c *Case1) handleSelectQuery(query string, dbm *db.DBManager, puzzleState int, currentFocus string) (core.GameResponse, int, string) {
	rows, err := dbm.QueryPlayer(query)
	if err != nil {
		return core.GameResponse{Error: err.Error()}, puzzleState, currentFocus
	}
	defer rows.Close()

	results, columns := c.serializeRows(rows)
	narrative := "Você executa a consulta. As linhas começam a surgir no monitor, frias e impessoais como qualquer outro log do DITEC."
	newPuzzleState := puzzleState
	newFocus := currentFocus

	if puzzleState == 3 {
		if currentFocus != "pendrive" {
			return core.GameResponse{Narrative: "Você não está com o pendrive conectado. Resolva o puzzle da estante primeiro."}, puzzleState, currentFocus
		}

		if c.checkPuzzle3(results) {
			narrative = `
SENHA CORRETA.

O LED do pendrive pisca em verde e um diretório oculto aparece na tela.
Dentro dele, uma planilha interna com a lista completa de funcionários do DITEC.

(Tabela 'funcionarios' desbloqueada)

Agora que você tem a lista de funcionários, pode começar a cruzar os dados com as provas. Falando em provas... talvez seja hora de reexaminar a cena do crime, começando pelo **corpo**.

(Puzzle 4 desbloqueado)
`
			newPuzzleState = 4
			newFocus = "none"
			return core.GameResponse{Narrative: narrative}, newPuzzleState, newFocus
		} else {
			narrative = `
A senha que você digitou não corresponde a nenhuma entrada válida.
O pendrive permanece mudo, como se te encarasse em silêncio.
Você respira fundo e tenta de novo.
`
		}
	}

	if puzzleState == 6 {
		if currentFocus != "sofa" {
			return core.GameResponse{Narrative: "Você não pode simplesmente adivinhar a pista final. 'OLHAR SOFÁ' pode te dar o que você precisa."}, puzzleState, currentFocus
		}

		if c.checkPuzzle6(results, columns, dbm) {
			narrative = `
É ISSO.

Você cruza os braços, observando a última linha retornada pela consulta.
A tela mostra apenas um nome: PEDRO.
Loiro, calça 42, alocado no Projeto PANTERA.

Todas as peças se encaixam — o fio de cabelo, a pegada ao lado do corpo, o acesso ao composto químico.

Você registra o relatório final. Não é o fim do mistério maior, mas pelo menos, nesta noite, o caso Marcos está oficialmente solucionado.

CASO FECHADO. (FIM DA FASE 1)
`
			newPuzzleState = 7
			newFocus = "none"
			return core.GameResponse{Narrative: narrative}, newPuzzleState, newFocus
		} else {
			narrative = `
Os resultados aparecem na tela, mas algo não fecha.
As conexões entre suspeitos, projetos e características físicas não batem com as provas da cena do crime.
Você sabe que precisa cruzar melhor as tabelas 'suspeitos', 'funcionarios', 'projetos_funcionarios' e 'projetos'.
`
		}
	}

	return core.GameResponse{Narrative: narrative, Data: results}, newPuzzleState, newFocus
}

func (c *Case1) handleExecStatement(query string, dbm *db.DBManager, puzzleState int, currentFocus string) (core.GameResponse, int, string) {
	if err := c.checkSafeQuery(query); err != nil {
		return core.GameResponse{Error: err.Error()}, puzzleState, currentFocus
	}

	result, err := dbm.ExecuteQueryPlayer(query)
	if err != nil {
		return core.GameResponse{Error: err.Error()}, puzzleState, currentFocus
	}

	rowsAffected, _ := result.RowsAffected()
	narrative := fmt.Sprintf("%d linhas afetadas.", rowsAffected)
	newPuzzleState := puzzleState
	newFocus := currentFocus

	switch puzzleState {
	case 1:
		if currentFocus != "quadro" {
			return core.GameResponse{Error: "Você precisa 'OLHAR QUADRO' antes de tentar adivinhar a solução."}, puzzleState, currentFocus
		}
		if c.checkPuzzle1(dbm) {
			narrative = `
BINGO!

As associações na tabela 'pistas_logicas' finalmente fazem sentido. No monitor, o pequeno quadro de lógica de Marcos se completa como ele teria gostado: elegante e sem contradições.
Uma luz verde acende no canto da tela. O sistema libera o próximo passo.

Enquanto você anota suas descobertas, um <i>clique</i> baixo, mas distinto, soa da direção da **estante** de livros.

(Puzzle 2 desbloqueado)
`
			newPuzzleState = 2
			newFocus = "none"
		} else {
			narrative = fmt.Sprintf("%d linhas afetadas.\nOs dados foram atualizados, mas alguma combinação ainda está errada.\nTalvez você tenha deixado escapar uma das pistas do quadro de cortiça.", rowsAffected)
		}

	case 2:
		if currentFocus != "estante" {
			return core.GameResponse{Error: "Você precisa 'OLHAR ESTANTE' antes de tentar organizá-la."}, puzzleState, currentFocus
		}
		if c.checkPuzzle2(dbm) {
			narrative = `
CLIQUE.

Você confirma a atualização da ordem dos livros e, alguns segundos depois, ouve um leve estalo dentro da estante.
Um compartimento escondido se abre revelando um pequeno pendrive.

Está protegido por senha, mas há um arquivo 'anotacoes.txt' visível:
'Marcos salvou a senha da forma mais estúpida. É o nome de um de seus projetos, mas ele usou "leet speak" (A=4, E=3) e adicionou algum lixo no final da string. A senha correta é o nome do projeto, limpo e em maiúsculas.'

(Puzzle 3 desbloqueado)
(Tabelas 'senhas_codificadas' e 'projetos' estão disponíveis)
`
			newPuzzleState = 3
			newFocus = "pendrive"
		} else {
			narrative = fmt.Sprintf("%d linhas afetadas.\nVocê reorganiza os livros, mas a estante permanece imóvel.\nSe há um mecanismo ali, ele ainda não foi acionado da forma correta...", rowsAffected)
		}

	case 4:
		if currentFocus != "corpo" {
			return core.GameResponse{Error: "Você precisa 'OLHAR CORPO' para saber quem adicionar à lista de suspeitos."}, puzzleState, currentFocus
		}
		if c.checkPuzzle4(dbm) {
			narrative = `
Você fecha mais uma query e observa a nova tabela de 'suspeitos'. 
Agora ela mostra apenas três nomes — todos com cabelo loiro. O círculo está apertando.

Ao se levantar, você quase pisa em algo. No <strong>chão</strong>, perto de onde o corpo estava, uma marca de sangue chama sua atenção.

(Puzzle 5 desbloqueado)
`
			newPuzzleState = 5
			newFocus = "none"
		}

	case 5:
		if currentFocus != "chao" {
			return core.GameResponse{Error: "Você precisa 'OLHAR CHÃO' para saber qual pegada usar como filtro."}, puzzleState, currentFocus
		}
		if c.checkPuzzle5(dbm) {
			narrative = `
Um DELETE bem aplicado e a lista de suspeitos encolhe ainda mais. 
Restam apenas dois nomes possíveis. Você sente que está chegando perto do agressor.

Você precisa de uma última pista para conectar um deles à arma do crime. 
Você se senta no velho <strong>sofá</strong> para pensar e sua mão bate em um jornal amassado.

(Puzzle 6 desbloqueado)
`
			newPuzzleState = 6
			newFocus = "sofa"
		}
	}

	return core.GameResponse{Narrative: narrative}, newPuzzleState, newFocus
}

func (c *Case1) checkSafeQuery(query string) error {
	upper := strings.ToUpper(strings.TrimSpace(query))

	if strings.HasPrefix(upper, "DROP") || strings.HasPrefix(upper, "TRUNCATE") || strings.HasPrefix(upper, "ALTER") {
		return fmt.Errorf("Comando perigoso bloqueado. Foque no caso, detetive.")
	}

	if strings.HasPrefix(upper, "DELETE") && !strings.Contains(upper, "DELETE FROM SUSPEITOS") {
		return fmt.Errorf("Comando perigoso bloqueado. Você só pode deletar da tabela 'suspeitos'.")
	}

	if strings.HasPrefix(upper, "UPDATE") && !(strings.Contains(upper, "UPDATE PISTAS_LOGICAS") || strings.Contains(upper, "UPDATE LIVROS")) {
		return fmt.Errorf("Comando perigoso bloqueado. Você não pode alterar esta tabela.")
	}

	return nil
}

func isSQL(cmd string) bool {
	upper := strings.ToUpper(cmd)
	return strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "UPDATE") || strings.HasPrefix(upper, "INSERT") || strings.HasPrefix(upper, "DELETE")
}

func (c *Case1) serializeRows(rows *sql.Rows) ([]map[string]interface{}, []string) {
	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		scanArgs := make([]interface{}, len(columns))
		for i := range values {
			scanArgs[i] = &values[i]
		}
		rows.Scan(scanArgs...)
		row := make(map[string]interface{})
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				row[columns[i]] = string(b)
			} else {
				row[columns[i]] = v
			}
		}
		results = append(results, row)
	}
	return results, columns
}

func normalize(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case 'á', 'à', 'ã', 'â', 'ä', 'Á', 'À', 'Ã', 'Â', 'Ä':
			r = 'a'
		case 'é', 'è', 'ê', 'ë', 'É', 'È', 'Ê', 'Ë':
			r = 'e'
		case 'í', 'ì', 'î', 'ï', 'Í', 'Ì', 'Î', 'Ï':
			r = 'i'
		case 'ó', 'ò', 'õ', 'ô', 'ö', 'Ó', 'Ò', 'Õ', 'Ô', 'Ö':
			r = 'o'
		case 'ú', 'ù', 'û', 'ü', 'Ú', 'Ù', 'Û', 'Ü':
			r = 'u'
		case 'ç', 'Ç':
			r = 'c'
		}

		r = unicode.ToUpper(r)
		b.WriteRune(r)
	}
	return b.String()
}

func (c *Case1) checkPuzzle1(dbm *db.DBManager) bool {
	rows, err := dbm.PlayerDB.Query(`
        SELECT posicao, nome, casa, bebida, profissao, animal
        FROM pistas_logicas
    `)
	if err != nil {
		log.Printf("P1 Check Err: %v", err)
		return false
	}
	defer rows.Close()

	type Linha struct {
		Nome, Casa, Bebida, Prof, Animal string
	}

	expected := map[int]Linha{
		1: {Nome: "PEDRO", Casa: "VERMELHA", Bebida: "AGUA", Prof: "ADVOCACIA", Animal: "PEIXE"},
		2: {Nome: "JOANA", Casa: "VERDE", Bebida: "CHA", Prof: "ARQUITETURA", Animal: "GATO"},
		3: {Nome: "RAFAELA", Casa: "AZUL", Bebida: "CAFE", Prof: "MEDICINA", Animal: "PAPAGAIO"},
		4: {Nome: "MARIANA", Casa: "AMARELA", Bebida: "SUCO", Prof: "ESTILISMO", Animal: "CACHORRO"},
	}

	count := 0

	for rows.Next() {
		var pos int
		var nome, casa, bebida, prof, animal string
		if err := rows.Scan(&pos, &nome, &casa, &bebida, &prof, &animal); err != nil {
			log.Printf("P1 Scan Err: %v", err)
			return false
		}

		exp, ok := expected[pos]
		if !ok {
			return false
		}

		if normalize(nome) != exp.Nome {
			return false
		}
		if normalize(casa) != exp.Casa {
			return false
		}
		if normalize(bebida) != exp.Bebida {
			return false
		}
		if normalize(prof) != exp.Prof {
			return false
		}
		if normalize(animal) != exp.Animal {
			return false
		}

		count++
	}

	return count == 4
}

func (c *Case1) checkPuzzle2(dbm *db.DBManager) bool {
	var count int

	err := dbm.PlayerDB.QueryRow(`
		WITH CorrectOrder AS (
			SELECT 
				id, 
				ROW_NUMBER() OVER (ORDER BY ano ASC) as correct_pos
			FROM livros
		)
		SELECT COUNT(*) 
		FROM livros l
		JOIN CorrectOrder co ON l.id = co.id
		WHERE l.posicao = co.correct_pos;
	`).Scan(&count)

	if err != nil {
		log.Printf("P2 Check Err: %v", err)
		return false
	}

	return count == 5
}

func (c *Case1) checkPuzzle3(results []map[string]interface{}) bool {
	senhaCorreta := "PANTERA"
	if len(results) != 1 {
		return false
	}
	for _, row := range results {
		for _, val := range row {
			if s, ok := val.(string); ok && strings.ToUpper(s) == senhaCorreta {
				return true
			}
		}
	}
	return false
}

func (c *Case1) checkPuzzle4(dbm *db.DBManager) bool {
	log.Println("Validando Puzzle 4...")
	var count int
	err := dbm.PlayerDB.QueryRow("SELECT COUNT(*) FROM suspeitos WHERE UPPER(nome) IN ('MARIA', 'PEDRO', 'ANA')").Scan(&count)
	if err != nil || count != 3 {
		log.Printf("P4 Falhou: Nomes errados ou contagem != 3 (é %d)", count)
		return false
	}
	err = dbm.PlayerDB.QueryRow("SELECT COUNT(*) FROM suspeitos").Scan(&count)
	return err == nil && count == 3
}

func (c *Case1) checkPuzzle5(dbm *db.DBManager) bool {
	log.Println("Validando Puzzle 5...")
	var count int

	err := dbm.PlayerDB.QueryRow("SELECT COUNT(*) FROM suspeitos").Scan(&count)
	if err != nil || count != 2 {
		log.Printf("P5 Falhou: Contagem != 2 (é %d)", count)
		return false
	}

	err = dbm.PlayerDB.QueryRow("SELECT COUNT(*) FROM suspeitos WHERE UPPER(nome) IN ('PEDRO', 'ANA')").Scan(&count)
	return err == nil && count == 2
}

func (c *Case1) checkPuzzle6(results []map[string]interface{}, columns []string, dbm *db.DBManager) bool {
	log.Println("Validando Puzzle 6...")
	solucaoCorreta := "PEDRO"
	if len(results) != 1 {
		return false
	}
	if len(columns) != 1 {
		return false
	}

	for _, row := range results {
		for _, val := range row {
			if s, ok := val.(string); ok && strings.ToUpper(s) == solucaoCorreta {
				var count int
				dbm.PlayerDB.QueryRow("SELECT COUNT(*) FROM suspeitos").Scan(&count)
				return count == 2
			}
		}
	}
	return false
}
