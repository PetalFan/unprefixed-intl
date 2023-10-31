# unprefixed-intl
An i18n library enabling translations without URL prefixes

`https://petalfan.com`  => `en` url

`https://petalfan.com`  => `es` url

`https://petalfan.com`  => `en-GB` url

the translations will be read on the server side, in the example of this README using [Accept Language Header](https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept-Language), but can be used from from a list of preferred languages, example:
```typescript
const acceptLanguages = ["en","en-US","en"]
```

# Usage
Add an `unprefixed-intl.config.json` file to the project root:
```json
{
  "messagesPath": "./src/messages",
  "defaultLang": "en",
  "maxAcceptedLanguageSearch": 3,
  "allowLanguageCode": true
}
```

That will result in the interface (will be used by the package):
```typescript
interface Config{
    /** Path for the `messages` folder, that will alloc the .json files with the translations, (en-US.json, ...) */
    messagesPath:string,
    /** The default language, that will be used if the preferred language was not found */
    defaultLang:string,
    /** From the list of preferred languages a loop will be run to look for the best match available, this is the
     * limit of iterations this loop can do */
    maxAcceptedLanguageSearch:number
    /** If true: if the complete code is not found, the language code can be used instead, e.g. if the preferred
     * language is `en-US`, but there is no `en-US.json` file but rather a ` en.json`, it will be used */
    allowLanguageCode:boolean
}
```

Add the translation files inside the `messagesPath` directory:

`en` language example: `./src/messages/en.json`
```json
{
  "Home.component1": {
    "hello_message": "Hello! Welcome!",
    "phrase": "I just got my driver's license, and now I need to get gas for my truck. In the fall, I'll enroll in college, and I'll make sure to check the schedule of my favorite soccer team."
  },
  "Home.component2": {
    "popup.warning_message": "Remember that the default translation file, defined in `defaultLang`, must exist!"
  }
}
```
`es` language example: `./src/messages/es.json`
```json
{
  "Home.component1": {
    "hello_message": "¡Hola! ¡Sea bienvenido!",
    "phrase": "Acabo de obtener mi licencia de conducir y ahora necesito gasolina para mi camión. En el otoño, me inscribiré en la universidad y me aseguraré de consultar el calendario de mi equipo de fútbol favorito."
  },
  "Home.component2": {
    "popup.warning_message": "Recuerde que el archivo de traducción predeterminado, definido en `defaultLang`, ¡debe existir!"
  }
}
```
`en-GB` language example: `./src/messages/en-GB.json`
```json
{
  "Home.component1": {
    "hello_message": "Hello! Welcome!",
    "phrase": "I've just got my driving licence, and now I need to get petrol for my lorry. In the autumn, I'll enrol in university, and I'll make sure to check the timetable of my favourite football team."
  },
  "Home.component2": {
    "popup.warning_message": "Remember that the default translation file, defined in `defaultLang`, must exist!"
  }
}
```

# In the place you want to read the translations:
this example is using Next.js, but it can be in any Node.js project:
`./src/app/page.tsx`
```typescript jsx
//#region just for example
import { headers } from 'next/headers'
//#endregion

import { getTranslations } from "unprefixed-intl/dist"

//#region just for example
export default function Home() {
    const headersList = headers()
    let acceptLanguages: string[]
    const referer = headersList.get('accept-language')
    if (referer) {
        acceptLanguages = referer.split(',')
    } else
        acceptLanguages = []
    //#endregion
    
    /*
    here you will receive the function that returns the 
    translations, based on a path (`"Home.component1"`), 
    and a string array (`acceptLanguages`), the order of 
    the elements of this array is important, as it 
    determines which translations will be prioritized
     */
    const t = getTranslations("Home.component1", acceptLanguages)
    
    //#region just for example
    return(
        <p>{t("hello_message")}</p>
    )
}
//#endregion
```
