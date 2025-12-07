const config = {
  // Mandatory env
  JWT_SECRET: process.env.JWT_SECRET,
  // Optional env
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
}

for (const [key, value] of Object.entries(config)) {
  if (!value)
    throw new Error(`${key} is not defined in env`)
}

export default config
