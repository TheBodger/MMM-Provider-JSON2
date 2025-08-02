# MMM-Provider-JSON2

version 2 of the MMM-Provider-JSON module for MagicMirror²
modelled after the MMM-Provider-JSON module by Me
uses the new Provider template


deep merge - 1 make sure that the config values have overwritten any deafult values

//iterate through the config overwriting the temporary default object, including any arrays

copy default config to tempconfig

newConfig = deepCopy1(config,tempconfig)

deepCopy1(configObject,defaultObject)

for each key in configObject
  if configObject[key].isobject deepCopy1(configObject[key],defaultObject[key])

  defaultObject[key] = configObject[key]

  return defaultObject

// wait

deep merge - 2 make sure all the newconfig arrays contain all the default values

newConfig = deepCopy2(newConfig,defaultConfig)

deepCopy2(configObject,defaultObject)

for each key in defaultObject
  if defaultObject[key].isobject deepCopy1(configObject[key],defaultObject[key])
  if defaultObject[key].isarray
    merge the arrays using all the values from defaultObject[key]
    for each array object in configobject[key]
      if object is not in defaultObject[key] then add it
