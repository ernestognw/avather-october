import { dnaVariants, notify } from './utils';
import Avather from './avather';
import { emptyInventory, inventoryItem, spinner } from './templates';
import Web3 from 'web3';

class UI {
  constructor() {
    this.web3 = null;
    this.avather = null;

    this.getElements();
    this.addListeners();
    this.init();
  }

  getElements = () => {
    this.buttons = {
      create: document.getElementById('create-button'),
      connect: document.getElementById('connect-button'),
    };

    this.tabs = {
      inventory: document.getElementById('inventory-tab'),
    };

    this.containers = {
      loading: document.getElementById('loading-container'),
      welcome: document.getElementById('welcome-container'),
      main: document.getElementById('main-container'),
      avatherContainer: document.getElementById('avatheeer-container'),
      inventory: document.getElementById('inventory-container'),
    };

    this.inputs = {
      create: document.getElementById('create-input'),
    };
  };

  addListeners = () => {
    this.buttons.connect.addEventListener('click', this.init);
    this.buttons.create.addEventListener('click', this.createRandomAvather);
    this.inputs.create.addEventListener('change', this.updateCreateInput);

    document.body.addEventListener('click', (event) => {
      if (event.target.classList.contains('button-gift')) {
        this.giftAvather(event);
      } else if (event.target.classList.contains('button-kill')) {
        this.killAvather(event);
      }
    });
  };

  init = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        notify('DApp loaded');

        this.web3 = new Web3(window.ethereum);
        const networkId = await this.web3.eth.net.getId();

        this.showMain();
        this.avather = new Avather(this.web3, networkId);
        this.loadInventory();
      } catch (err) {
        console.log(err);
        notify('Has rechazado la conexion');
        this.showWelcome();
      }
    } else {
      notify('Necesitas un proveedor de web3');
      this.showWelcome();
    }
  };

  showMain = () => {
    this.containers.welcome.classList.add('hidden');
    this.containers.main.classList.remove('hidden');
    this.containers.loading.classList.add('hidden');
  };

  showWelcome = () => {
    this.containers.welcome.classList.remove('hidden');
    this.containers.main.classList.add('hidden');
    this.containers.loading.classList.add('hidden');
  };

  loadInventory = async () => {
    const address = await this.web3.eth.getAccounts();
    const avathers = await this.avather.getAvathersByOwner(address[0]);

    this.containers.inventory.innerHTML = '';

    if (avathers.length > 0) {
      for (let i = 0; i < avathers.length; i++) {
        const avatherImage = this.generateAvathersSrc(avathers[i].dna);

        this.containers.inventory.insertAdjacentHTML(
          'beforeend',
          inventoryItem(
            avathers[i].id,
            avathers[i].name,
            avathers[i].dna,
            avatherImage
          )
        );
      }
    } else {
      this.containers.inventory.innerHTML = emptyInventory;
    }
  };

  generateAvathersSrc = (dna) => {
    let src = 'https://avataaars.io/?avatarStyle=Circle&';

    Object.keys(dnaVariants).forEach((attribute, index) => {
      const element =
        dna.substring(index * 2, (index + 1) * 2) %
        dnaVariants[attribute].length;
      src += `${attribute}=${dnaVariants[attribute][element]}&`;
    });

    return src;
  };

  createRandomAvather = async (event) => {
    event.preventDefault();

    if (this.inputs.create.value.length > 20) {
      notify('Ponle nombre mas corto');
      return;
    }

    if (this.inputs.create.value.length == 0) {
      notify('Ponle nombre');
      return;
    }

    this.buttons.create.disabled = true;

    notify('Creando avather...');

    this.buttons.create.innerHTML = spinner;

    const addresses = await this.web3.eth.getAccounts();
    const receipt = await this.avather.createRandomAvather(
      this.inputs.create.value,
      addresses[0]
    );
    notify('Avather creado');
    notify(receipt.transactionHash);

    this.containers.avatherContainer.innerHTML = '';
    this.containers.avatherContainer.src = './images/placeholder.png';
    this.inputs.create.value = '';

    await this.loadInventory();

    this.tabs.inventory.click();
  };

  updateCreateInput = async (event) => {
    if (event.target.value.length > 0) {
      const addresses = await this.web3.eth.getAccounts();

      const dna = await this.avather.generateRandomDna(
        event.target.value,
        addresses[0]
      );

      const imageSrc = this.generateAvathersSrc(dna);

      this.containers.avatherContainer.src = imageSrc;
    } else {
      this.containers.avatherContainer.src = './images/placeholder.png';
    }
  };

  /**
   * Kills an avather
   *
   * @param {{string}} param0
   */
  killAvather = async ({ target }) => {
    const confirmation = confirm('Are you sure?');
    const avatherContainer = document.getElementById(
      `avatheeer-${target.name}`
    );

    if (!confirmation) {
      notify('Canceled');
      return;
    }

    target.disabled = true;
    // avatherContainer.classList.add('fade');

    const [address] = await this.web3.eth.getAccounts();

    notify('Killing avather');
    target.disabled = true;
    target.innerHTML = spinner;
    try {
      const { transactionHash } = await this.avather.burn(target.name, address);
      notify(`Avather is gone: ${transactionHash}`);
      this.loadInventory();
    } catch (err) {
      notify(err.message, 'error');
    }
    target.innerText = 'Kill';
    target.disabled = false;
    // avatherContainer.classList.remove('fade');
  };

  /**
   * Transfers an avather to somebody else's address
   *
   * @param {{string}} param0
   */
  giftAvather = async ({ target }) => {
    const sendTo = prompt('Enter address which should receive your Avather');
    const avatherContainer = document.getElementById(
      `avatheeer-${target.name}`
    );

    // To check if address is valid
    if (!this.avather.isValidAddress(sendTo)) {
      notify('Please enter a valid address');
      return;
    }

    target.disabled = true;
    avatherContainer.classList.add('fade');

    const [address] = await this.web3.eth.getAccounts();

    notify('Sending avather');
    target.innerHTML = spinner;
    target.disabled = true;
    try {
      const { transactionHash } = await this.avather.giftAvather(
        sendTo,
        target.name,
        address
      );
      notify('Avather sent');
      notify(transactionHash);
      this.loadInventory();
    } catch (err) {
      notify(err.message, 'error');
    }
    target.innerText = 'Gift';
    target.disabled = false;
    avatherContainer.classList.remove('fade');
  };
}

export default UI;
