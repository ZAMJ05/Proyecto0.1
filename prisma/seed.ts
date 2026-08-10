import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMonths, addYears } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@inventario.local",
        name: "Administrador IT",
        passwordHash: adminHash,
        role: "ADMIN",
      },
      {
        email: "consulta@inventario.local",
        name: "Usuario Consulta",
        passwordHash: userHash,
        role: "USER",
      },
    ],
  });

  const positions = await Promise.all([
    prisma.position.create({
      data: { name: "Desarrollador", description: "Ingeniería de software" },
    }),
    prisma.position.create({
      data: { name: "Analista", description: "Análisis de negocio" },
    }),
    prisma.position.create({
      data: { name: "Soporte IT", description: "Mesa de ayuda" },
    }),
    prisma.position.create({
      data: { name: "Gerente", description: "Liderazgo de área" },
    }),
  ]);

  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: "Ana García",
        email: "ana.garcia@empresa.com",
        department: "TI",
        positionId: positions[0].id,
      },
    }),
    prisma.employee.create({
      data: {
        name: "Luis Pérez",
        email: "luis.perez@empresa.com",
        department: "Operaciones",
        positionId: positions[1].id,
      },
    }),
    prisma.employee.create({
      data: {
        name: "María López",
        email: "maria.lopez@empresa.com",
        department: "TI",
        positionId: positions[2].id,
      },
    }),
    prisma.employee.create({
      data: {
        name: "Carlos Ruiz",
        email: "carlos.ruiz@empresa.com",
        department: "Dirección",
        positionId: positions[3].id,
      },
    }),
  ]);

  const now = new Date();
  const buy = (yearsAgo: number, monthsAgo = 0) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - yearsAgo);
    d.setMonth(d.getMonth() - monthsAgo);
    return d;
  };

  type SeedAsset = {
    name: string;
    category: string;
    brand: string;
    model: string;
    serialNumber: string;
    inventoryNumber: string;
    status: string;
    purchaseDate: Date;
    anydesk?: string;
    notes?: string;
  };

  const assetsData: SeedAsset[] = [
    {
      name: "Laptop Ana",
      category: "Laptop",
      brand: "Dell",
      model: "Latitude 5440",
      serialNumber: "DL-5440-001",
      inventoryNumber: "INV-L-001",
      status: "Activo",
      purchaseDate: buy(1, 2),
      anydesk: "123456789",
      notes: "Equipo principal desarrollo",
    },
    {
      name: "Laptop Luis",
      category: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14",
      serialNumber: "LN-T14-002",
      inventoryNumber: "INV-L-002",
      status: "Activo",
      purchaseDate: buy(3, 10),
      anydesk: "987654321",
    },
    {
      name: "Laptop Reserva",
      category: "Laptop",
      brand: "HP",
      model: "EliteBook 840",
      serialNumber: "HP-840-003",
      inventoryNumber: "INV-L-003",
      status: "Stock",
      purchaseDate: buy(0, 1),
      notes: "Nueva en reserva",
    },
    {
      name: "Laptop Reparación",
      category: "Laptop",
      brand: "Dell",
      model: "XPS 13",
      serialNumber: "DL-XPS-004",
      inventoryNumber: "INV-L-004",
      status: "Reparacion",
      purchaseDate: buy(2),
      notes: "Pantalla dañada",
    },
    {
      name: "Monitor Oficina 24",
      category: "Monitor",
      brand: "LG",
      model: "24MP60",
      serialNumber: "LG-24-010",
      inventoryNumber: "INV-M-010",
      status: "Activo",
      purchaseDate: buy(1),
    },
    {
      name: "Monitor Stock",
      category: "Monitor",
      brand: "Samsung",
      model: "S24R35",
      serialNumber: "SM-24-011",
      inventoryNumber: "INV-M-011",
      status: "Stock",
      purchaseDate: buy(0, 2),
    },
    {
      name: "Mouse Ergonómico",
      category: "Mouse",
      brand: "Logitech",
      model: "MX Master 3",
      serialNumber: "LG-MX-020",
      inventoryNumber: "INV-MS-020",
      status: "Activo",
      purchaseDate: buy(0, 8),
    },
    {
      name: "Teclado Mecánico",
      category: "Teclado",
      brand: "Logitech",
      model: "MX Keys",
      serialNumber: "LG-KB-021",
      inventoryNumber: "INV-KB-021",
      status: "Activo",
      purchaseDate: buy(0, 8),
    },
    {
      name: "Dock USB-C",
      category: "Dock",
      brand: "Dell",
      model: "WD19",
      serialNumber: "DL-WD-030",
      inventoryNumber: "INV-DK-030",
      status: "Activo",
      purchaseDate: buy(1, 6),
    },
    {
      name: "Firewall Principal",
      category: "Firewall",
      brand: "Fortinet",
      model: "FortiGate 60F",
      serialNumber: "FT-60F-100",
      inventoryNumber: "INV-FW-100",
      status: "Activo",
      purchaseDate: buy(2),
    },
    {
      name: "Switch Core",
      category: "Switch",
      brand: "Cisco",
      model: "Catalyst 9200",
      serialNumber: "CS-9200-101",
      inventoryNumber: "INV-SW-101",
      status: "Activo",
      purchaseDate: buy(3),
    },
    {
      name: "Access Point Piso 2",
      category: "AccesPoint",
      brand: "Ubiquiti",
      model: "U6 Pro",
      serialNumber: "UB-U6-110",
      inventoryNumber: "INV-AP-110",
      status: "Activo",
      purchaseDate: buy(1, 3),
    },
    {
      name: "MeetingBar Sala A",
      category: "MeetingBar",
      brand: "Yealink",
      model: "A20",
      serialNumber: "YL-A20-120",
      inventoryNumber: "INV-MB-120",
      status: "Activo",
      purchaseDate: buy(0, 10),
    },
    {
      name: "Adaptador HDMI",
      category: "Adaptador",
      brand: "Anker",
      model: "USB-C Hub",
      serialNumber: "AK-HUB-130",
      inventoryNumber: "INV-AD-130",
      status: "Stock",
      purchaseDate: buy(0, 1),
    },
    {
      name: "Laptop Baja",
      category: "Laptop",
      brand: "HP",
      model: "ProBook 450",
      serialNumber: "HP-450-099",
      inventoryNumber: "INV-L-099",
      status: "Baja",
      purchaseDate: buy(5),
      notes: "Fin de vida útil",
    },
    {
      name: "Laptop Disponible",
      category: "Laptop",
      brand: "Lenovo",
      model: "V15",
      serialNumber: "LN-V15-005",
      inventoryNumber: "INV-L-005",
      status: "Activo",
      purchaseDate: buy(0, 4),
      anydesk: "555666777",
      notes: "Activa sin asignar",
    },
  ];

  const assets: Array<{
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    purchaseDate: Date;
  }> = [];
  for (const a of assetsData) {
    const asset = await prisma.asset.create({
      data: {
        ...a,
        renewalDate: addYears(a.purchaseDate, 4),
      },
    });
    assets.push(asset);
    await prisma.activityLog.create({
      data: {
        assetId: asset.id,
        action: "Alta",
        details: `Equipo ${asset.name} registrado con estado ${asset.status}`,
      },
    });
  }

  const assign = async (
    assetSerial: string,
    employeeEmail: string,
    monthsAgo = 0
  ) => {
    const asset = assets.find((x) => x.serialNumber === assetSerial)!;
    const employee = employees.find((e) => e.email === employeeEmail)!;
    const assignedAt = new Date();
    assignedAt.setMonth(assignedAt.getMonth() - monthsAgo);
    await prisma.assignment.create({
      data: { assetId: asset.id, employeeId: employee.id, assignedAt },
    });
    await prisma.activityLog.create({
      data: {
        assetId: asset.id,
        action: "Asignación",
        details: `${asset.name} asignado a ${employee.name}`,
      },
    });
  };

  await assign("DL-5440-001", "ana.garcia@empresa.com", 10);
  await assign("LG-24-010", "ana.garcia@empresa.com", 10);
  await assign("LG-MX-020", "ana.garcia@empresa.com", 8);
  await assign("LG-KB-021", "ana.garcia@empresa.com", 8);
  await assign("LN-T14-002", "luis.perez@empresa.com", 20);
  await assign("DL-WD-030", "luis.perez@empresa.com", 12);
  await assign("YL-A20-120", "maria.lopez@empresa.com", 6);

  // Historical unassignment
  const oldAsset = assets.find((x) => x.serialNumber === "HP-450-099")!;
  const past = new Date();
  past.setFullYear(past.getFullYear() - 1);
  const pastEnd = new Date(past);
  pastEnd.setMonth(pastEnd.getMonth() + 6);
  await prisma.assignment.create({
    data: {
      assetId: oldAsset.id,
      employeeId: employees[3].id,
      assignedAt: past,
      unassignedAt: pastEnd,
      notes: "Asignación histórica antes de baja",
    },
  });

  // Maintenances for computing equipment
  for (const asset of assets.filter((a) =>
    ["Laptop", "Monitor", "MeetingBar"].includes(a.category)
  )) {
    let next = addMonths(asset.purchaseDate, 6);
    while (next < now) {
      const completed = new Date(next);
      await prisma.maintenance.create({
        data: {
          assetId: asset.id,
          scheduledDate: next,
          completedDate: completed,
          status: "Completado",
          notes: "Mantenimiento preventivo",
        },
      });
      next = addMonths(next, 6);
    }
    await prisma.maintenance.create({
      data: {
        assetId: asset.id,
        scheduledDate: next,
        status: next <= addMonths(now, 1) ? "Próximo" : "Pendiente",
        notes: "Mantenimiento cada 6 meses",
      },
    });
  }

  console.log("Seed completado.");
  console.log("Credenciales iniciales (cámbialas después del primer acceso):");
  console.log("  Admin -> admin@inventario.local / admin123");
  console.log("  User  -> consulta@inventario.local / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
