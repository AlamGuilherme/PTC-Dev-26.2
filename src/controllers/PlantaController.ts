import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

// O id vem da URL como texto. Aqui eu converto pra número
// e devolvo null se não for um inteiro maior que zero (ex: "abc", "1.5", "-3")
const lerId = (valor: string): number | null => {
    const id = Number(valor);
    if (Number.isInteger(id) && id > 0) {
        return id;
    }
    return null;
};

// Confere os dados da planta e devolve a mensagem do erro, ou null se estiver tudo certo.
// parcial = false -> cadastro (POST): todos os campos são obrigatórios
// parcial = true  -> edição (PATCH): só confere os campos que vieram no body
const validarPlanta = (body: any, parcial: boolean): string | null => {
    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = body;

    // Só no cadastro: checo se algum campo faltou.
    // Uso === undefined porque !0 e !false dão true e recusariam estoque 0 e petFriendly false
    if (!parcial) {
        const obrigatorios = ["nome", "especie", "preco", "estoque", "luminosidade", "petFriendly", "regaACadaDias"];
        for (const campo of obrigatorios) {
            if (body[campo] === undefined) {
                return `O campo ${campo} é obrigatório.`;
            }
        }
    }

    // Daqui pra baixo, só valido o que foi enviado (undefined = não veio, então pula)
    if (nome !== undefined && (typeof nome !== "string" || nome.trim() === "")) {
        return "nome deve ser um texto não vazio.";
    }

    if (especie !== undefined && (typeof especie !== "string" || especie.trim() === "")) {
        return "especie deve ser um texto não vazio.";
    }

    // Number.isInteger já barra "8990" (texto), 89.9 e NaN
    if (preco !== undefined && (!Number.isInteger(preco) || preco <= 0)) {
        return "preco deve ser um inteiro maior que zero (em centavos).";
    }

    if (estoque !== undefined && (!Number.isInteger(estoque) || estoque < 0)) {
        return "estoque deve ser um inteiro maior ou igual a zero.";
    }

    if (luminosidade !== undefined && !Object.values(Luminosidade).includes(luminosidade)) {
        return "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.";
    }

    if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
        return "petFriendly deve ser true ou false.";
    }

    if (regaACadaDias !== undefined && (!Number.isInteger(regaACadaDias) || regaACadaDias < 1)) {
        return "regaACadaDias deve ser um inteiro maior ou igual a 1.";
    }

    return null;
};

export const createPlanta = async (req: Request, res: Response) => {
    try {
        // o ?? {} é pra não quebrar se o cliente nem mandar body
        const body = req.body ?? {};

        const erro = validarPlanta(body, false);
        if (erro) {
            return res.status(400).json({ message: erro });
        }

        // pego campo por campo em vez de passar o req.body inteiro pro banco
        const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = body;

        const planta = await PlantaRepository.createPlanta({
            nome: nome,
            especie: especie,
            preco: preco,
            estoque: estoque,
            luminosidade: luminosidade,
            petFriendly: petFriendly,
            regaACadaDias: regaACadaDias,
        });

        return res.status(201).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao criar planta." });
    }
};

export const readAllPlantas = async (req: Request, res: Response) => {
    try {
        // tudo que vem na query chega como texto (ou undefined se não foi enviado)
        const { luminosidade, petFriendly, nome, ordem } = req.query;

        if (
            luminosidade !== undefined &&
            !Object.values(Luminosidade).includes(luminosidade as Luminosidade)
        ) {
            return res.status(400).json({
                message: "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.",
            });
        }

        if (petFriendly !== undefined && petFriendly !== "true" && petFriendly !== "false") {
            return res.status(400).json({ message: "petFriendly deve ser true ou false." });
        }

        // o typeof barra o caso de mandarem ?nome=a&nome=b (aí chegaria uma lista)
        if (nome !== undefined && (typeof nome !== "string" || nome.trim() === "")) {
            return res.status(400).json({ message: "nome deve ser um texto não vazio." });
        }

        if (ordem !== undefined && ordem !== "preco" && ordem !== "nome") {
            return res.status(400).json({ message: "ordem deve ser preco ou nome." });
        }

        const plantas = await PlantaRepository.findAllPlantas(
            {
                luminosidade: luminosidade as Luminosidade | undefined,
                // se eu fizesse só petFriendly === "true", um filtro não enviado viraria false
                petFriendly: petFriendly === undefined ? undefined : petFriendly === "true",
                // contains = busca parcial, insensitive = ignora maiúscula/minúscula
                nome: nome === undefined ? undefined : { contains: nome as string, mode: "insensitive" },
            },
            ordem === "preco" ? { preco: "asc" } : ordem === "nome" ? { nome: "asc" } : undefined,
        );

        // filtro válido sem resultado devolve [] com 200, nunca 404
        return res.status(200).json(plantas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar plantas." });
    }
};

export const readPlantaById = async (req: Request, res: Response) => {
    try {
        const id = lerId(req.params.id);
        if (id === null) {
            return res.status(400).json({ message: "id inválido." });
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        return res.status(200).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar planta." });
    }
};

export const updatePlanta = async (req: Request, res: Response) => {
    try {
        const id = lerId(req.params.id);
        if (id === null) {
            return res.status(400).json({ message: "id inválido." });
        }

        const body = req.body ?? {};

        const erro = validarPlanta(body, true);
        if (erro) {
            return res.status(400).json({ message: erro });
        }

        // busco antes de editar: se a planta não existe, o Prisma jogaria erro
        // e a resposta sairia 500 em vez de 404
        const planta = await PlantaRepository.findPlantaById(id);
        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = body;

        // campo undefined o Prisma ignora, então só muda o que foi enviado
        const plantaAtualizada = await PlantaRepository.updatePlanta(id, {
            nome: nome,
            especie: especie,
            preco: preco,
            estoque: estoque,
            luminosidade: luminosidade,
            petFriendly: petFriendly,
            regaACadaDias: regaACadaDias,
        });

        return res.status(200).json(plantaAtualizada);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao atualizar planta." });
    }
};

export const deletePlanta = async (req: Request, res: Response) => {
    try {
        const id = lerId(req.params.id);
        if (id === null) {
            return res.status(400).json({ message: "id inválido." });
        }

        // mesma ideia do update: checo se existe antes de apagar
        const planta = await PlantaRepository.findPlantaById(id);
        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        await PlantaRepository.deletePlanta(id);

        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao deletar planta." });
    }
};

export const readValorTotalEstoque = async (req: Request, res: Response) => {
    try {
        const plantas = await PlantaRepository.findPrecoEEstoque();

        let valorTotalEmCentavos = 0;
        let totalDeVasos = 0;

        // o aggregate do Prisma não multiplica colunas, então somo na mão
        for (const planta of plantas) {
            valorTotalEmCentavos += planta.preco * planta.estoque;
            totalDeVasos += planta.estoque;
        }

        // sem plantas, os dois ficam 0 e continua sendo 200
        return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao calcular valor do estoque." });
    }
};

export const venderPlanta = async (req: Request, res: Response) => {
    try {
        const id = lerId(req.params.id);
        if (id === null) {
            return res.status(400).json({ message: "id inválido." });
        }

        const quantidade = (req.body ?? {}).quantidade;
        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            return res.status(400).json({ message: "quantidade deve ser um inteiro maior que zero." });
        }

        const planta = await PlantaRepository.findPlantaById(id);
        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        // sem estoque suficiente: devolve 400 e não mexe em nada
        if (planta.estoque < quantidade) {
            return res.status(400).json({ message: `Temos só ${planta.estoque} vasos` });
        }

        // Obs: entre o if de cima e esta linha, outra venda pode passar na frente
        // (race condition). Deixei assim de propósito pra manter simples.
        const plantaAtualizada = await PlantaRepository.decrementEstoque(id, quantidade);

        return res.status(200).json(plantaAtualizada);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao registrar venda." });
    }
};

// bônus: lista só as plantas com estoque zerado
export const readPlantasEsgotadas = async (req: Request, res: Response) => {
    try {
        const plantas = await PlantaRepository.findPlantasEsgotadas();

        return res.status(200).json(plantas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar plantas esgotadas." });
    }
};