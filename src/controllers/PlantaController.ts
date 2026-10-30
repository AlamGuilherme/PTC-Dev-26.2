import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

// Converte Id pra numero ou retorna null
const lerId = (valor: string):number | null =>{
    const id = Number(valor);
    if (Number.isInteger(id) && id > 0) {
        return id;
    }
    return null;
};

// Valida os dados da plata. Devolve o erro ou null se tiver errado

const validarPlanta = (body : any, parcial : boolean) : string | null =>{
    const {nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias} = body;

    // Pra quando tiver faltando alguma informação
    if (!parcial) {
        const obrigatorios = ["nome", "especie", "preco", "estoque", "luminosidade", "petFriendly", "regaACadaDias"];
        for (const campo of obrigatorios){
            if (body[campo] === undefined){
                return `O campo ${campo} é obrigatório.`;
            }
        }
    }

    // Quando as informações não são validas
    if (nome !== undefined && (typeof nome !== "string" || nome.trim() === "")) {
        return "nome deve ser um texto não vazio";
    }

    if (especie !== undefined && (typeof especie !== "string" || especie.trim() === "")) {
        return "especie deve ser um texto não vazio.";
    }

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
    try{
        const body = req.body ?? {};

        const erro = validarPlanta(body,false);
        if (erro){
            return res.status(400).json({ message: erro});
        }

        const {nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias} = body;

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
        return res.status(500).json({ message : "Erro ao criar planta."})
    }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    
    const { luminosidade, petFriendly } = req.query;

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

    const plantas = await PlantaRepository.findAllPlantas({
      luminosidade: luminosidade as Luminosidade | undefined,
    
      petFriendly: petFriendly === undefined ? undefined : petFriendly === "true",
    });

    
    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const readPlantaById = async (req: Request, res: Response) =>{
    try {
        const id = lerId(req.params.id);
        if (id === null){
            return res.status(400).json({ message: "id inválido."});
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada."});
        }

        return res.status(200).json(planta);
    } catch (error){
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar planta."});
    }
};

export const updatePlanta = async (req: Request, res: Response) => {
    try {
        const id = lerId(req.params.id);
        if (id === null){
            return res.status(400).json({ message: "id inválido."});
        }

        const body = req.body ?? {};

        const erro = validarPlanta(body,true);
        if (erro){
            return res.status(400).json({ message: erro });
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = body;

    
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