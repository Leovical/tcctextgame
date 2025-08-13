-- internal/db/schema.sql

-- Tabela para o Puzzle 1: Quadro de Fotos
CREATE TABLE IF NOT EXISTS pistas_logicas (
    nome TEXT PRIMARY KEY,
    cor_casa TEXT,
    bebida TEXT,
    profissao TEXT,
    animal TEXT
);

-- Tabela para o Puzzle 3: Senha do Pendrive
CREATE TABLE IF NOT EXISTS senhas_codificadas (
    id INTEGER PRIMARY KEY,
    senha_embaralhada TEXT NOT NULL
);

-- Tabela para o Puzzle 4, 5 e 6: Fio de Cabelo, Pegada e Produto Químico
CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    sobrenome TEXT NOT NULL,
    cor_cabelo TEXT,
    tamanho_pe INTEGER
);

-- Tabela de junção para o Puzzle 6
CREATE TABLE IF NOT EXISTS projetos_funcionarios (
    id INTEGER PRIMARY KEY,
    funcionario_id INTEGER,
    projeto_id INTEGER
);

-- Tabela de projetos para o Puzzle 6
CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL
);

-- Tabela para a lista de suspeitos, manipulada pelo jogador
CREATE TABLE IF NOT EXISTS suspeitos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL
);

-- Puzzle 1
INSERT OR IGNORE INTO pistas_logicas (nome, cor_casa, bebida, profissao, animal) VALUES
('Pedro', 'vermelha', '', 'advogado', ''),
('Joana', 'azul', 'chá', '', ''),
('Mariana', '', '', 'estilista', 'gato'),
('Rafaela', '', 'café', '', '');

INSERT OR IGNORE INTO pistas_logicas (nome, cor_casa, bebida, profissao, animal) VALUES
('Pedro', 'vermelha', 'suco', 'advogado', 'cachorro'),
('Joana', 'azul', 'chá', 'arquiteta', 'peixe'),
('Mariana', 'verde', 'água', 'estilista', 'gato'),
('Rafaela', 'amarela', 'café', 'médica', 'papagaio');

INSERT OR IGNORE INTO senhas_codificadas (id, senha_embaralhada) VALUES (1, 'ozaeriM13');

-- Puzzle 4 e 5
INSERT OR IGNORE INTO funcionarios (id, nome, sobrenome, cor_cabelo, tamanho_pe) VALUES
(1, 'Lucas', 'Silva', 'castanho', 42),
(2, 'Maria', 'Santos', 'loiro', 38),
(3, 'Felipe', 'Oliveira', 'preto', 44),
(4, 'Pedro', 'Queiroz', 'loiro', 42);

-- Puzzle 6
INSERT OR IGNORE INTO projetos (id, nome) VALUES (1, 'Projeto PANTERA');
INSERT OR IGNORE INTO projetos (id, nome) VALUES (2, 'Projeto FÊNIX');

INSERT OR IGNORE INTO projetos_funcionarios (funcionario_id, projeto_id) VALUES (1, 1);
INSERT OR IGNORE INTO projetos_funcionarios (funcionario_id, projeto_id) VALUES (2, 2);
INSERT OR IGNORE INTO projetos_funcionarios (funcionario_id, projeto_id) VALUES (3, 2);
INSERT OR IGNORE INTO projetos_funcionarios (funcionario_id, projeto_id) VALUES (4, 1);