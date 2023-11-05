import {config} from "./config";
import * as fs from "fs";
import * as path from "path";

const translationsMap = new Map<string, TranslationType>();
let defaultLangInnerMap:TranslationType = {};
reloadMessages();
type JsonType = {
    [key: string]: {
        [key: string]: string;
    }
}
type TranslationType = {
    [key:string]:PathType
}
type PathType = {
    [key:string]:string
}

/**
 * Rebuild the map of the translations, based is translations files
 */
export function reloadMessages(){
    translationsMap.clear()
    const messagesFolderPath = process.cwd()+"/"+config.messagesPath+"/"
    fs.readdirSync(messagesFolderPath)
        .filter(filename => path.extname(filename) === '.json')
        .forEach(filename => {
            const filePath = messagesFolderPath + filename;
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent) as JsonType;

            const resultMap:TranslationType = {};
            for (const key in data) {
                const innerMap:PathType = {};
                for (const innerKey in data[key]) {
                    innerMap[innerKey] = data[key][innerKey];
                }
                resultMap[key] = innerMap;
            }

            const baseFilename = path.basename(filename, '.json');
            translationsMap.set(baseFilename, resultMap);
        });

    defaultLangInnerMap = translationsMap.get(config.defaultLang) as TranslationType
    if(!defaultLangInnerMap)
        throw new Error("the default language was not found, default language:["+config.defaultLang+"], folder: "+config.messagesPath);

}

/**
 * Returns the best available translation option
 *
 * @param acceptLanguages - An array of accepted languages, typically returned from the `accept-language` header.
 * The function will use the first available language in the order of the array. If none are found, it will use the default language.
 * Optional: will use the Accept Language Header provided from the "next/headers" import
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
 * @param path - The main path for the translation.
 * @param acceptLanguages - An array of accepted languages, typically returned from the `accept-language` header.
 * The function will use the first available language in the order of the array. If none are found, it will use the default language.
 * Optional: will use the Accept Language Header provided from the "next/headers" import
 *
 * @returns A function that, when given a `subPath`, returns the translation string located within the main `path`.
 */
export function getTranslations(path:string,acceptLanguages?:string[]):(subPath:string)=>string{
    const langMap = translationsMap.get(bestAvailableOption(acceptLanguages))
    if (langMap){
        const values = langMap[path];
        if (values) {
            return (subPath: string) => {
                const value = values[subPath];
                if (value)
                    return value;
                return path + "." + subPath
            }
        }
    }
    return (subPath:string)=>{
        return path+"."+subPath
    }
}

/**
 * Initiates the generation of translation files for different languages based on a source language.
 *
 * The `generate` function automates the creation of translation files by iterating through a list
 * of language codes and corresponding file names. For each language, it calls a provided `handle`
 * function that should perform the actual translation of text strings from the source language to the
 * target language. After translations are processed, the new language maps are written to corresponding
 * JSON files within the messages folder path defined in the configuration.
 *
 * @param from - The source language code from which translations will start.
 * @param list - An array of tuples where each tuple contains a target language code and the corresponding output file name.
 * @param handle - A function to handle the translation from the source language to each of the target languages.
 *                 It should return a promise resolving to the translated string.
 * @param onSingleSuccess - An optional callback invoked after a single language translation is successfully completed.
 *                          If it returns false, the generation process will be stopped.
 * @param onSingleError - An optional callback invoked when an error occurs during the translation of a single language.
 *                        If it returns false, the generation process will be stopped.
 *
 * @throws Will throw an error if the source language map is not found.
 *
 * @example
 * generate(
 *   'en',
 *   [['es', 'es'], ['de', 'de']],
 *   async (text, to) => {
 *     // Assume translateText is a function that handles the API calls to a translation service.
 *     return await translate(text, {from: en,to: to};
 *   },
 *   (to) => { console.log(`Successfully generated ${to} translations.`); return true; },
 *   (error) => { console.error('Error during translation:', error); return false; }
 * );
 */

export function generate(
    from:string,
    list:[string,string][],
    handle:(text:string,to:string)=>Promise<string>,
    onSingleSuccess?:(to:string)=>boolean,
    onSingleError?:(error:any)=>boolean){
    const langMap = translationsMap.get(from)
    if (!langMap)
        throw new Error("from language not found: "+from)

    const messagesFolderPath = process.cwd()+"/"+config.messagesPath+"/"
    let shouldBreak:boolean = false;
    for(let i = 0; i < list.length;i++){
        (async () => {
            const [languageCode,fileName] = list[i]
            try {
                const newLangMap: TranslationType = {}

                const langMapKeys = Object.keys(langMap);

                for (const innerMapKey of langMapKeys) {
                    const innerMap = langMap[innerMapKey]
                    const newLangInnerMap: PathType = {};

                    const constInnerMapKeys = Object.keys(innerMap);

                    for (const textKey of constInnerMapKeys) {
                        const text = innerMap[textKey];

                        if (shouldBreak) {
                            return;
                        }
                        newLangInnerMap[textKey] = await handle(text, languageCode);
                    }
                    newLangMap[innerMapKey] = newLangInnerMap
                }

                fs.writeFileSync(messagesFolderPath+fileName+".json", JSON.stringify(newLangMap), "utf8")
                if (onSingleSuccess&&!onSingleSuccess(languageCode))
                    shouldBreak = true;
            }catch (err){
                if (onSingleError&&!onSingleError(err))
                    shouldBreak = true;
            }
        })();
    }
}