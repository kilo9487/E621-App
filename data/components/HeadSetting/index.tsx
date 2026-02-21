import type { NextPage } from 'next';
import Head from 'next/head';

export interface HeadSettingProps {
  title?: string
  icon?: string
}

const HeadSetting: NextPage<HeadSettingProps> = (prop) => {
  return (
    <>
      <Head>
        <title>{prop.title ?? "KIASENOLO"}</title>
        <link rel="icon" href={prop.icon ?? "/favicon.svg"} sizes="any" />
      </Head>
    </>
  )
}

export default HeadSetting