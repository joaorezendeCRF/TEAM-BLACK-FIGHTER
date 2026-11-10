/*
=====================================================
PROJETO: TEAM BLACK FIGHTER
ARQUIVO: scripts/gerar-hash.cjs
OBJETIVO: Gerar hash Argon2id para cadastro SQL
=====================================================
*/

// Define a função principal do programa.
async function main() {

    // Importa a biblioteca Argon2 dinamicamente.
    // Evita o aviso do ESLint relacionado ao require().
    const argon2 = await
    // Importa os recursos de outro módulo usados pelas operações deste arquivo.
    import ("argon2");


    // Importa dinamicamente a biblioteca de perguntas.
    // Ela permite ocultar a senha durante a digitação.
    const { password } = await
    // Importa os recursos de outro módulo usados pelas operações deste arquivo.
    import ("@inquirer/prompts");

    // Exibe o título do programa.
    console.log("\n=== TEAM BLACK FIGHTER ===");

    // Explica o objetivo do procedimento.
    console.log("Gerador seguro de hash para cadastro SQL.\n");

    // Solicita a senha sem mostrar os caracteres digitados.
    const senha = await password({

        // Mensagem apresentada no terminal.
        message: "Digite a senha do administrador:",

        // Substitui os caracteres digitados por asteriscos.
        mask: "*",

    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });


    // Verifica se o usuário informou alguma senha.
    if (senha.length === 0) {

        // Impede o cadastro de uma senha vazia.
        console.log("A senha não pode ficar vazia.");

        // Interrompe a geração do hash.
        return;
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Solicita a confirmação da senha.
    const confirmacao = await password({

        // Mensagem apresentada no terminal.
        message: "Confirme a senha:",

        // Oculta os caracteres digitados.
        mask: "*",

    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });

    // Compara a senha com sua confirmação.
    if (senha !== confirmacao) {

        // Informa que as senhas são diferentes.
        console.log("As senhas não coincidem.");

        // Interrompe o procedimento.
        return;
    // Conclui a condição de validação e seu bloco de tratamento, preservando a estrutura e o escopo definidos.
    }

    // Gera o hash utilizando Argon2id.
    const hash = await argon2.hash(senha, {

        // Seleciona a variante Argon2id.
        type: argon2.argon2id,

        // Reserva 64 MiB de memória para o algoritmo.
        memoryCost: 65536,

        // Define três iterações.
        timeCost: 3,

        // Define o paralelismo.
        parallelism: 1,

    // Conclui o objeto de dados ou opções passado à operação, preservando a estrutura e o escopo definidos.
    });

    // Exibe somente o hash gerado.
    console.log("\nHASH ARGON2ID GERADO:");

    // Apresenta o resultado que será utilizado no MySQL.
    console.log(hash);

    // Confirma a conclusão da operação.
    console.log("\nHash gerado com sucesso.");

    // Orienta a utilizar somente o hash no cadastro SQL.
    console.log("Copie o hash para o MySQL Workbench.");
// Conclui a função main, preservando a estrutura e o escopo definidos.
}

// Executa o programa principal.
main().catch(() => {

    // Informa uma falha sem exibir senhas.
    console.error("Não foi possível gerar o hash.");

    // Marca a execução como malsucedida.
    process.exitCode = 1;

// Conclui o manipulador ou retorno assíncrono da operação, preservando a estrutura e o escopo definidos.
});