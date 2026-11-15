const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const integerFormatter = new Intl.NumberFormat('pt-BR');

/**
 * Formata um valor inteiro em centavos para moeda BRL (ex.: 1250 -> "R$ 12,50").
 */
export function formatCentsToBRL(cents: number): string {
    return brlFormatter.format(cents / 100);
}

/**
 * Formata números inteiros (ex.: quantidade mínima de atacado ou estoque) em pt-BR.
 */
export function formatInteger(value: number): string {
    return integerFormatter.format(value);
}
