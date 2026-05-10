import dotenv from 'dotenv';
dotenv.config({ path: '../server/.env' });

const { generateSmartSummaryNIM } = await import('../server/src/services/nim-api.service.js');

async function run() {
  try {
    const res = await generateSmartSummaryNIM("Hello world, vectors are important in physics.", "full");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR:");
    console.error(err.message);
  }
}
run();
