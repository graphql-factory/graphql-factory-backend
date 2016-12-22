import chai from 'chai'
import * as graphql from 'graphql'
import factory from 'graphql-factory'
import unitTests from './unit/index'

global.chai = chai
global.expect = chai.expect
global.graphql = graphql
global.factory = factory

unitTests()