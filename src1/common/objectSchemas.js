import Joi from 'joi'
const VALID_KEY_RX = /.+/

export const definitionSchema = Joi.object().keys({
  externalTypes: Joi.object().pattern(VALID_KEY_RX, Joi.object()).optional(),
  fields: Joi.object().pattern(VALID_KEY_RX, Joi.object()).optional(),
  functions: Joi.object().pattern(VALID_KEY_RX, Joi.object()).optional(),
  globals: Joi.object().optional(),
  schemas: Joi.object().pattern(VALID_KEY_RX, Joi.object()).optional(),
  types: Joi.object().pattern(VALID_KEY_RX, Joi.object()).required()
})

export const configSchema = Joi.object().keys({
  definition: definitionSchema.required(),
  name: Joi.string().min(1).default('GraphqlFactoryBackend'),
  namespace: Joi.string().min(1).required(),
  options: Joi.object().default({}),
  plugin: [Joi.object().optional(), Joi.array().optional()]
})