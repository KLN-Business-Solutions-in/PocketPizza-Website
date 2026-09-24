import type { Category } from '@pokket-pizza/contract/contract';

/**
 * Local development menu seed.
 *
 * The production Prisma service should replace this module with the database
 * repository. Keeping the same frozen contract here makes the frontend usable
 * against a real HTTP backend while the local database is being provisioned.
 */
export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Pizzas',
    sortOrder: 1,
    items: [
      {
        id: 'prod-1',
        name: 'Farmhouse Pizza',
        description: 'Loaded with fresh vegetables and mozzarella cheese.',
        basePrice: '249.00',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
        isVeg: true,
        variants: [
          { id: 'v1-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v1-medium', label: 'Medium', priceDelta: '80.00' },
          { id: 'v1-large', label: 'Large', priceDelta: '150.00' },
        ],
        addOns: [{ id: 'a1-extra-cheese', label: 'Extra Cheese', price: '40.00' }],
      },
      {
        id: 'prod-2',
        name: 'Margherita Pizza',
        description: 'Classic tomato sauce topped with mozzarella cheese.',
        basePrice: '199.00',
        imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3',
        isVeg: true,
        variants: [
          { id: 'v2-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v2-medium', label: 'Medium', priceDelta: '70.00' },
          { id: 'v2-large', label: 'Large', priceDelta: '130.00' },
        ],
        addOns: [
          { id: 'a2-extra-cheese', label: 'Extra Cheese', price: '40.00' },
          { id: 'a2-jalapenos', label: 'Jalapenos', price: '30.00' },
        ],
      },
      {
        id: 'prod-3',
        name: 'Paneer Tikka Pizza',
        description: 'Paneer tikka with onion, capsicum and mozzarella cheese.',
        basePrice: '279.00',
        imageUrl: 'https://images.unsplash.com/photo-1579751626657-72bc17010498',
        isVeg: true,
        variants: [
          { id: 'v3-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v3-medium', label: 'Medium', priceDelta: '80.00' },
          { id: 'v3-large', label: 'Large', priceDelta: '150.00' },
        ],
        addOns: [
          { id: 'a3-extra-cheese', label: 'Extra Cheese', price: '40.00' },
          { id: 'a3-extra-paneer', label: 'Extra Paneer', price: '60.00' },
        ],
      },
      {
        id: 'prod-4',
        name: 'Veggie Supreme Pizza',
        description: 'A loaded combination of vegetables, olives and cheese.',
        basePrice: '299.00',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
        isVeg: true,
        variants: [
          { id: 'v4-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v4-medium', label: 'Medium', priceDelta: '90.00' },
          { id: 'v4-large', label: 'Large', priceDelta: '160.00' },
        ],
        addOns: [
          { id: 'a4-extra-cheese', label: 'Extra Cheese', price: '40.00' },
          { id: 'a4-olives', label: 'Olives', price: '30.00' },
        ],
      },
      {
        id: 'prod-5',
        name: 'Chicken Tikka Pizza',
        description: 'Chicken tikka with onion and mozzarella cheese.',
        basePrice: '329.00',
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
        isVeg: false,
        variants: [
          { id: 'v5-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v5-medium', label: 'Medium', priceDelta: '90.00' },
          { id: 'v5-large', label: 'Large', priceDelta: '170.00' },
        ],
        addOns: [
          { id: 'a5-extra-cheese', label: 'Extra Cheese', price: '40.00' },
          { id: 'a5-extra-chicken', label: 'Extra Chicken', price: '70.00' },
        ],
      },
      {
        id: 'prod-6',
        name: 'Pepperoni Pizza',
        description: 'Pepperoni with mozzarella cheese and pizza sauce.',
        basePrice: '349.00',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
        isVeg: false,
        variants: [
          { id: 'v6-small', label: 'Small', priceDelta: '0.00' },
          { id: 'v6-medium', label: 'Medium', priceDelta: '100.00' },
          { id: 'v6-large', label: 'Large', priceDelta: '180.00' },
        ],
        addOns: [
          { id: 'a6-extra-cheese', label: 'Extra Cheese', price: '40.00' },
          { id: 'a6-extra-pepperoni', label: 'Extra Pepperoni', price: '80.00' },
        ],
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'Sides',
    sortOrder: 2,
    items: [
      {
        id: 'prod-7',
        name: 'Garlic Bread',
        description: 'Toasted garlic bread seasoned with herbs.',
        basePrice: '99.00',
        imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c',
        isVeg: true,
        variants: [],
        addOns: [{ id: 'a7-cheese-dip', label: 'Cheese Dip', price: '30.00' }],
      },
      {
        id: 'prod-8',
        name: 'Cheesy Garlic Bread',
        description: 'Garlic bread topped with melted cheese.',
        basePrice: '139.00',
        imageUrl: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c',
        isVeg: true,
        variants: [],
        addOns: [{ id: 'a8-extra-cheese', label: 'Extra Cheese', price: '40.00' }],
      },
      {
        id: 'prod-9',
        name: 'Chicken Wings',
        description: 'Seasoned chicken wings.',
        basePrice: '199.00',
        imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f',
        isVeg: false,
        variants: [],
        addOns: [],
      },
    ],
  },
  {
    id: 'cat-3',
    name: 'Drinks',
    sortOrder: 3,
    items: [
      {
        id: 'prod-10',
        name: 'Coca-Cola',
        description: 'Chilled soft drink.',
        basePrice: '60.00',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97',
        isVeg: true,
        variants: [],
        addOns: [],
      },
      {
        id: 'prod-11',
        name: 'Sprite',
        description: 'Chilled lemon-lime soft drink.',
        basePrice: '60.00',
        imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7',
        isVeg: true,
        variants: [],
        addOns: [],
      },
      {
        id: 'prod-12',
        name: 'Mineral Water',
        description: 'Packaged drinking water.',
        basePrice: '30.00',
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8',
        isVeg: true,
        variants: [],
        addOns: [],
      },
    ],
  },
];
