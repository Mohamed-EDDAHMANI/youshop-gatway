export const publicRoutes: RegExp[] = [
  // Auth Service - Public
  /^\/s1\/auth\/login\/post$/,
  /^\/s1\/auth\/register\/post$/,
  /^\/s1\/auth\/refresh\/post$/,

  // Catalog Service - Public
  /^\/s2\/health\/get$/,
  /^\/s2\/product\/find-all\/get$/,
  /^\/s2\/products\/get$/,
  /^\/s2\/product\/getOne\/[^\/]+\/get$/, 
  /^\/s2\/product\/filter\/post$/,
  /^\/s2\/category\/find-all\/get$/,
  
  // Inventory Service - Public (lecture seule du stock)
  /^\/s3\/health\/get$/,
  /^\/s3\/inventory\/sku\/[^\/]+\/get$/, 
  /^\/s3\/inventory\/find-by-sku\/[^\/]+\/get$/,
  
  /^\/s4\/health\/get$/,
  /^\/s4\/orders\/create-order$/,
  /^\/s4\/orders\/find-one\/[^\/]+\/get$/,
  /^\/s4\/orders\/remove\/[^\/]+\/get$/,
];
