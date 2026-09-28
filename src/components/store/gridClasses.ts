// Product grid layouts, shared by the server grid and the client filter grid.
export const gridClass = (cols: 3 | 4) =>
  cols === 4 ? "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4" : "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4";
export const masonryClass = (cols: 3 | 4) => (cols === 4 ? "columns-2 gap-x-5 md:columns-4" : "columns-2 gap-x-5 md:columns-3 lg:columns-4");
