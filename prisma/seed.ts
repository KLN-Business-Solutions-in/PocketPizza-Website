import {config } from "dotenv";
config({path: "backend/.env"});
import { PrismaClient } from "../backend/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });


if (process.env.NODE_ENV === "production") {
  throw new Error("Seeding is disabled in production.");
}

if (process.env.ALLOW_DATABASE_RESET !== "true") {
  throw new Error(
    "Database reset blocked. Set ALLOW_DATABASE_RESET=true to run the development seed."
  );
}
async function main() {
  console.log("🌱 Starting Pokket Pizza database seed...");

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not defined");
  }

  const passwordHash = await argon2.hash(adminPassword);

  // --------------------------------------------------
  // CLEAN EXISTING DEVELOPMENT DATA
  // This makes the seed safe to run again.
  // --------------------------------------------------

  await prisma.notification.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();

  await prisma.itemAddOn.deleteMany();
  await prisma.itemVariant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();

  await prisma.adminUser.deleteMany();
  await prisma.restaurant.deleteMany();

  // --------------------------------------------------
  // RESTAURANT
  // --------------------------------------------------

  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Pokket Pizza",
      phone: "9998887770",
      address: "Pune, Maharashtra",
      deliveryFee: 30,
    },
  });

  // --------------------------------------------------
  // ADMIN USER
  // --------------------------------------------------

  await prisma.adminUser.create({
    data: {
      restaurantId: restaurant.id,
      email: "admin@pokketpizza.com",
      passwordHash,
      name: "Pokket Pizza Admin",
      role: "admin",
    },
  });

  // --------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------

  const pizzas = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Pizzas",
      sortOrder: 1,
    },
  });

  const sides = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Sides",
      sortOrder: 2,
    },
  });

  const drinks = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Drinks",
      sortOrder: 3,
    },
  });

  // ==================================================
  // PIZZAS
  // ==================================================

  // Farmhouse values are explicitly provided
  // in the database sprint plan.
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Farmhouse Pizza",
      description:
        "Loaded with fresh vegetables and mozzarella cheese.",
      basePrice: 249,
      isVeg: true,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 80,
          },
          {
            label: "Large",
            priceDelta: 150,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Margherita Pizza",
      description:
        "Classic tomato sauce topped with mozzarella cheese.",
      basePrice: 199,
      isVeg: true,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 70,
          },
          {
            label: "Large",
            priceDelta: 130,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
          {
            label: "Jalapenos",
            price: 30,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Paneer Tikka Pizza",
      description:
        "Paneer tikka with onion, capsicum and mozzarella cheese.",
      basePrice: 279,
      isVeg: true,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 80,
          },
          {
            label: "Large",
            priceDelta: 150,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
          {
            label: "Extra Paneer",
            price: 60,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Veggie Supreme Pizza",
      description:
        "A loaded combination of vegetables, olives and cheese.",
      basePrice: 299,
      isVeg: true,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 90,
          },
          {
            label: "Large",
            priceDelta: 160,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
          {
            label: "Olives",
            price: 30,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Chicken Tikka Pizza",
      description:
        "Chicken tikka with onion and mozzarella cheese.",
      basePrice: 329,
      isVeg: false,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 90,
          },
          {
            label: "Large",
            priceDelta: 170,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
          {
            label: "Extra Chicken",
            price: 70,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzas.id,
      name: "Pepperoni Pizza",
      description:
        "Pepperoni with mozzarella cheese and pizza sauce.",
      basePrice: 349,
      isVeg: false,

      variants: {
        create: [
          {
            label: "Small",
            priceDelta: 0,
          },
          {
            label: "Medium",
            priceDelta: 100,
          },
          {
            label: "Large",
            priceDelta: 180,
          },
        ],
      },

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
          {
            label: "Extra Pepperoni",
            price: 80,
          },
        ],
      },
    },
  });

  // ==================================================
  // SIDES
  // ==================================================

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: sides.id,
      name: "Garlic Bread",
      description:
        "Toasted garlic bread seasoned with herbs.",
      basePrice: 99,
      isVeg: true,

      addOns: {
        create: [
          {
            label: "Cheese Dip",
            price: 30,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: sides.id,
      name: "Cheesy Garlic Bread",
      description:
        "Garlic bread topped with melted cheese.",
      basePrice: 139,
      isVeg: true,

      addOns: {
        create: [
          {
            label: "Extra Cheese",
            price: 40,
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: sides.id,
      name: "Chicken Wings",
      description:
        "Seasoned chicken wings.",
      basePrice: 199,
      isVeg: false,
    },
  });

  // ==================================================
  // DRINKS
  // ==================================================

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Coca-Cola",
      description:
        "Chilled soft drink.",
      basePrice: 60,
      isVeg: true,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Sprite",
      description:
        "Chilled lemon-lime soft drink.",
      basePrice: 60,
      isVeg: true,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Mineral Water",
      description:
        "Packaged drinking water.",
      basePrice: 30,
      isVeg: true,
    },
  });

  // ==================================================
  // SAMPLE CUSTOMERS
  // ==================================================

  // Anjali Sharma is the sample customer
  // explicitly given in the sprint plan.
  await prisma.customer.create({
    data: {
      restaurantId: restaurant.id,
      name: "Anjali Sharma",
      phone: "9876543210",

      addresses: {
        create: [
          {
            line1: "Flat 203, ABC Society",
            city: "Pune",
            pincode: "411001",
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      restaurantId: restaurant.id,
      name: "Rahul Patil",
      phone: "9876543211",

      addresses: {
        create: [
          {
            line1: "12, Model Colony",
            landmark: "Near Main Road",
            city: "Pune",
            pincode: "411016",
          },
        ],
      },
    },
  });

  await prisma.customer.create({
    data: {
      restaurantId: restaurant.id,
      name: "Sneha Kulkarni",
      phone: "9876543212",

      addresses: {
        create: [
          {
            line1: "45, Karve Nagar",
            city: "Pune",
            pincode: "411052",
          },
        ],
      },
    },
  });

  // ==================================================
  // SUMMARY
  // ==================================================

  console.log("âœ… Pokket Pizza seed completed successfully!");
  console.log("---------------------------------------");
  console.log("Restaurant: Pokket Pizza");
  console.log("Categories: 3");
  console.log("Menu items: 12");
  console.log("Customers: 3");
  console.log("---------------------------------------");
  console.log("Admin login:");
  console.log("Email: admin@pokketpizza.com");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
