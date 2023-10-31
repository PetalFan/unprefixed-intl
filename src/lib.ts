import {config} from "./config";
import * as fs from "fs";
import * as path from "path";

const translationsMap = new Map<string, Map<string, Map<string, string>>>();
type JsonType = {
    [key: string]: {
        [key: string]: string;
    }
}
fs.readdirSync(config.messagesPath)
    .filter(filename => path.extname(filename) === '.json')
    .forEach(filename => {
        const filePath = path.join(config.messagesPath, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent) as JsonType;

        const resultMap = new Map<string, Map<string, string>>();
        for (const key in data) {
            const innerMap = new Map<string, string>();
            for (const innerKey in data[key]) {
                innerMap.set(innerKey, data[key][innerKey]);
            }
            resultMap.set(key, innerMap);
        }

        const baseFilename = path.basename(filename, '.json');
        translationsMap.set(baseFilename, resultMap);
    });

if(!translationsMap.has(config.defaultLang))
    throw new Error("the default language was not found, default language:["+config.defaultLang+"], folder: "+config.messagesPath);

/**
 * Returns the best available translation option
 *
 * @param acceptLanguages - An array of accepted languages, typically returned from the `accept-language` header.
 * The function will use the first available language in the order of the array. If none are found, it will use the default language.
 */
export function bestAvailableOption(acceptLanguages:string[]):string{
    for(let i = 0; i < acceptLanguages.length;i++){
        const acceptLanguage = acceptLanguages[i]
        if (translationsMap.has(acceptLanguage)){
            return acceptLanguage;
        }
        if (config.allowLanguageCode) {
            const split = acceptLanguage.split('-', 2)
            if (split.length > 1 && translationsMap.has(split[0])) {
                return split[0];
            }
        }
    }
    return config.defaultLang;
}

/**
 * Provides a translation function based on the accepted languages and a specified path.
 *
 * @param acceptLanguages - An array of accepted languages, typically returned from the `accept-language` header.
 * The function will use the first available language in the order of the array. If none are found, it will use the default language.
 * @param path - The main path for the translation.
 *
 * @returns A function that, when given a `subPath`, returns the translation string located within the main `path`.
 */
export function getTranslations(path:string,acceptLanguages:string[]):(subPath:string)=>string{
    const innerMap = translationsMap.get(bestAvailableOption(acceptLanguages))
    if (innerMap.has(path)){
        const values = innerMap.get(path);
        return (subPath:string)=>{
            if (values.has(subPath))
                return values.get(subPath);
            return path+"."+subPath
        }
    }
    return (subPath:string)=>{
        return path+"."+subPath
    }
}