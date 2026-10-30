import { Prisma } from "@prisma/client";
import prisma from "@database";

export const createPlanta = async (data: Prisma.PlantaCreateInput) => {
    return await prisma.planta.create({
        data: data,
    });
};

// filtros e ordem são opcionais: se vier undefined, o Prisma simplesmente ignora
export const findAllPlantas = async (
    filtros: Prisma.PlantaWhereInput = {},
    ordem?: Prisma.PlantaOrderByWithRelationInput,
) => {
    return await prisma.planta.findMany({
        where: filtros,
        orderBy: ordem,
    });
};

export const findPlantaById = async (id: number) => {
    return await prisma.planta.findUnique({
        where: { id: id },
    });
};

export const updatePlanta = async (id: number, data: Prisma.PlantaUpdateInput) => {
    return await prisma.planta.update({
        where: { id: id },
        data: data,
    });
};

export const deletePlanta = async (id: number) => {
    return await prisma.planta.delete({
        where: { id: id },
    });
};

// só pego preço e estoque porque são os únicos campos que a conta do valor total usa
export const findPrecoEEstoque = async () => {
    return await prisma.planta.findMany({
        select: { preco: true, estoque: true },
    });
};

// o decrement faz a subtração direto no banco, sem eu precisar calcular o novo estoque
export const decrementEstoque = async (id: number, quantidade: number) => {
    return await prisma.planta.update({
        where: { id: id },
        data: { estoque: { decrement: quantidade } },
    });
};

// bônus: plantas com estoque zerado
export const findPlantasEsgotadas = async () => {
    return await prisma.planta.findMany({
        where: { estoque: 0 },
    });
};