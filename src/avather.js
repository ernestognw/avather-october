import AvatherArtifact from '../build/contracts/Avathers.json';

class Avather {
  constructor(web3, networkId) {
    const abi = AvatherArtifact.abi;
    const address = AvatherArtifact.networks[networkId].address;
    this.contract = new web3.eth.Contract(abi, address);
  }

  getAvathersByOwner = async (address) => {
    const avatherIds = await this.contract.methods
      .getAvathersByOwner(address)
      .call();

    const avathers = [];

    for (let i = 0; i < avatherIds.length; i++) {
      const avather = await this.contract.methods.avather(avatherIds[i]).call();
      avathers.push({
        id: avatherIds[i],
        name: avather.name,
        dna: avather.dna,
      });
    }

    return avathers;
  };

  generateRandomDna = (name, address) => {
    return this.contract.methods.generateRandomDna(name, address).call();
  };

  createRandomAvather = (name, address) => {
    return this.contract.methods.createRandomAvather(name).send({
      from: address,
    });
  };

  giftAvather = (to, avatherId, address) =>
    new Promise((resolve, reject) => {
      // Calls the public `transferFrom` function from the smart contract
      this.contract.methods
        .transferFrom(address, to, avatherId)
        .send({
          from: address,
          gas: 1000000,
          gasPrice: 1000000000,
          gasLimit: 1000000,
        })
        .on('error', reject)
        .on('receipt', resolve);
    });

  /**
   * Check if address is valid
   * @param {string} address
   */
  isValidAddress = (address) => /^(0x)?[0-9a-f]{40}$/i.test(address);

  /**
   * Completely burns an avather
   *
   * @param {string|number} avatherId
   * @param {string} address
   */
  burn = (avatherId, address) =>
    new Promise((resolve, reject) => {
      // Calls the public `burn` function from the smart contract
      this.contract.methods
        .burn(avatherId)
        .send({
          from: address,
          gas: 1000000,
          gasPrice: 1000000000,
          gasLimit: 1000000,
        })
        .on('error', reject)
        .on('receipt', resolve);
    });
}

export default Avather;
