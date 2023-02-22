import deployContracts from './deploy';

async function main() {
  await deployContracts(false);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
