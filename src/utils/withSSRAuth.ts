import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { destroyCookie, parseCookies } from 'nookies'
import decode from 'jwt-decode'

import { AuthTokenError } from '../services/errors/AuthTokenError'
import { ValidadeUserPermissions } from './validadeUserPermissions'

type withSSRAuthoptions = {
  permissions?: string[]
  roles?: string[]
}

type TokenProps = {
  permissions: string[]
  roles: string[]
}

export function withSSRAuth<p>(fn: GetServerSideProps<p>, options?: withSSRAuthoptions) {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<p>> => {
    const { 'nextauth.token': token } = parseCookies(ctx)

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        }
      }
    }

    if (options) {
      const user = decode<TokenProps>(token)
      const { permissions, roles } = options

      const userHasValidPermissions = ValidadeUserPermissions({
        user,
        permissions,
        roles,
      })

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false,
          }
        }
      }
    }

    try {
      return await fn(ctx)
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextauth.token')
        destroyCookie(ctx, 'nextauth.refreshToken')

        return {
          redirect: {
            destination: '/',
            permanent: false,
          }
        }
      }
    }
  }
}
