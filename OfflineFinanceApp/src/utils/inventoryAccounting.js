export const parsePurchaseBatches = value => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const serializePurchaseBatches = batches =>
  JSON.stringify(
    batches.map(batch => ({
      quantity: Number(batch.quantity || 0),
      unitCost: Number(batch.unitCost || 0),
      date: batch.date,
    })),
  );

export const createFallbackPurchaseBatches = product => {
  const quantity = Number(product?.quantity || 0);
  const unitCost = Number(
    product?.weighted_average_cost ??
      product?.purchase_price ??
      product?.cost_price ??
      0,
  );

  if (quantity <= 0 || unitCost <= 0) {
    return [];
  }

  return [
    {
      quantity,
      unitCost,
      date: product?.updated_at || new Date().toISOString(),
    },
  ];
};

export const getProductPurchaseBatches = product => {
  const batches = parsePurchaseBatches(product?.purchase_batches)
    .map(batch => ({
      quantity: Number(batch.quantity || 0),
      unitCost: Number(batch.unitCost || 0),
      date: batch.date || product?.updated_at || new Date().toISOString(),
    }))
    .filter(batch => batch.quantity > 0 && batch.unitCost >= 0);

  return batches.length > 0 ? batches : createFallbackPurchaseBatches(product);
};

export const calculateWeightedAverageCost = ({
  currentQuantity,
  currentWeightedAverageCost,
  fallbackUnitCost,
  purchaseQuantity,
  purchaseUnitCost,
}) => {
  const stockQuantity = Number(currentQuantity || 0);
  const currentCost = Number(
    currentWeightedAverageCost ?? fallbackUnitCost ?? 0,
  );
  const nextQuantity = Number(purchaseQuantity || 0);
  const nextCost = Number(purchaseUnitCost || 0);
  const totalQuantity = stockQuantity + nextQuantity;

  if (totalQuantity <= 0) {
    return 0;
  }

  return (
    (stockQuantity * currentCost + nextQuantity * nextCost) / totalQuantity
  );
};

export const appendPurchaseBatch = (product, batch) =>
  [...getProductPurchaseBatches(product), batch].sort(
    (left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime(),
  );

export const depletePurchaseBatchesFifo = (product, quantityToSell) => {
  let remainingToSell = Number(quantityToSell || 0);
  let cogs = 0;
  const remainingBatches = [];
  const batches = getProductPurchaseBatches(product).sort(
    (left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  const fallbackUnitCost = Number(
    product?.weighted_average_cost ??
      product?.purchase_price ??
      product?.cost_price ??
      0,
  );

  batches.forEach(batch => {
    if (remainingToSell <= 0) {
      remainingBatches.push(batch);
      return;
    }

    const availableQuantity = Number(batch.quantity || 0);
    const consumedQuantity = Math.min(availableQuantity, remainingToSell);
    cogs += consumedQuantity * Number(batch.unitCost || 0);
    remainingToSell -= consumedQuantity;

    const leftoverQuantity = availableQuantity - consumedQuantity;
    if (leftoverQuantity > 0) {
      remainingBatches.push({...batch, quantity: leftoverQuantity});
    }
  });

  if (remainingToSell > 0) {
    cogs += remainingToSell * fallbackUnitCost;
  }

  return {
    cogs,
    remainingBatches,
  };
};
