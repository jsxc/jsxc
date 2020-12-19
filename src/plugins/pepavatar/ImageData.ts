export default class ImageData
{
    data : string;
    type : string;
    hash : string;

    constructor(cdata: string, ctype: string, chash: string)
    {
        this.data=cdata;
        this.type=ctype;
        this.hash=chash;
    }

    public getData()
    {
        return this.data;
    }

    public getType()
    {
        return this.type;
    }

    public getHash()
    {
        return this.hash;
    }
}