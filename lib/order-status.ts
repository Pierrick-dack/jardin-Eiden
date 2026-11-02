// Libellés et couleurs des statuts de commande (compte client et admin)
export const orderStatusLabel = {
  EN_ATTENTE: { label: "En attente de paiement", color: "var(--earth)" },
  PAYEE: { label: "Payée", color: "var(--success)" },
  EN_PREPARATION: { label: "En préparation", color: "var(--foliage)" },
  EXPEDIEE: { label: "Expédiée", color: "var(--foliage)" },
  LIVREE: { label: "Livrée", color: "var(--success)" },
  ANNULEE: { label: "Annulée", color: "var(--danger)" },
} as const;
