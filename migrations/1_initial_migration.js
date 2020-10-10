const Migrations = artifacts.require('Migrations');
const Avathers = artifacts.require('Avathers');

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(Avathers);
};
