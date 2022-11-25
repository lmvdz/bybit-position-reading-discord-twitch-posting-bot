    import { Buffer } from 'buffer';
    window.Buffer = Buffer;
    //@ts-ignore
    import ccxt from 'ccxt';
    //@ts-ignore
    const validExchanges = ccxt.exchanges.filter((exchange: string) => new ccxt[exchange]().hasFetchPositions);

    export default validExchanges;