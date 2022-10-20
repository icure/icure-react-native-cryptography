// // @ts-ignore
// import {
//   ICURE_TS_TEST_URL,
//   ICURE_TS_TEST_MSG_GTW_URL,
//   ICURE_TS_TEST_PAT_AUTH_PROCESS_ID,
//   ICURE_TS_TEST_AUTH_PROCESS_HCP_ID,
//   ICURE_TS_TEST_MSG_GTW_SPEC_ID,
//   ICURE_TS_TEST_HCP_USER,
//   ICURE_TS_TEST_HCP_PWD,
//   ICURE_TS_TEST_HCP_PRIV_KEY,
//   ICURE_TS_TEST_PAT_USER,
//   ICURE_TS_TEST_PAT_PWD,
//   ICURE_TS_TEST_PAT_PRIV_KEY,
//   ICURE_TS_TEST_HCP_2_USER,
//   ICURE_TS_TEST_HCP_2_PWD,
//   ICURE_TS_TEST_HCP_2_PRIV_KEY,
//   ICURE_TS_TEST_HCP_3_USER,
//   ICURE_TS_TEST_HCP_3_PWD,
//   ICURE_TS_TEST_HCP_3_PRIV_KEY,
// } from '@env';
//
// import { v4 as uuid } from 'uuid';
// import axios, { Method } from 'axios';
// import {
//   MedTechApi,
//   AnonymousMedTechApiBuilder,
//   User,
// } from '@icure/medical-device-sdk';
// import { hex2ua } from '@icure/api';
//
// import crypto from '../index';
//
// type TestVars = {
//   iCureUrl: string;
//   msgGtwUrl: string;
//   patAuthProcessId: string;
//   authProcessHcpId: string;
//   specId: string;
//   hcpUserName: string;
//   hcpPassword: string;
//   hcpPrivKey: string;
//   patUserName: string;
//   patPassword: string;
//   patPrivKey: string;
//   hcp2UserName: string;
//   hcp2Password: string;
//   hcp2PrivKey: string;
//   hcp3UserName: string;
//   hcp3Password: string;
//   hcp3PrivKey: string;
// };
//
// function getEnvVariables(): TestVars {
//   return {
//     iCureUrl: ICURE_TS_TEST_URL ?? 'https://kraken.icure.dev/rest/v1',
//     msgGtwUrl: ICURE_TS_TEST_MSG_GTW_URL ?? 'https://msg-gw.icure.cloud',
//     patAuthProcessId:
//       ICURE_TS_TEST_PAT_AUTH_PROCESS_ID ?? '6a355458dbfa392cb5624403190c39e5',
//     authProcessHcpId: ICURE_TS_TEST_AUTH_PROCESS_HCP_ID!,
//     specId: ICURE_TS_TEST_MSG_GTW_SPEC_ID ?? 'ic',
//     hcpUserName: ICURE_TS_TEST_HCP_USER!,
//     hcpPassword: ICURE_TS_TEST_HCP_PWD!,
//     hcpPrivKey: ICURE_TS_TEST_HCP_PRIV_KEY!,
//     patUserName: ICURE_TS_TEST_PAT_USER!,
//     patPassword: ICURE_TS_TEST_PAT_PWD!,
//     patPrivKey: ICURE_TS_TEST_PAT_PRIV_KEY!,
//     hcp2UserName: ICURE_TS_TEST_HCP_2_USER!,
//     hcp2Password: ICURE_TS_TEST_HCP_2_PWD!,
//     hcp2PrivKey: ICURE_TS_TEST_HCP_2_PRIV_KEY!,
//     hcp3UserName: ICURE_TS_TEST_HCP_3_USER!,
//     hcp3Password: ICURE_TS_TEST_HCP_3_PWD!,
//     hcp3PrivKey: ICURE_TS_TEST_HCP_3_PRIV_KEY!,
//   };
// }
//
// async function getTempEmail(): Promise<string> {
//   return `${uuid().substring(0, 8)}@icure.com`;
// }
//
// async function getEmail(email: string): Promise<any> {
//   const { msgGtwUrl, specId } = getEnvVariables();
//   const emailOptions = {
//     method: 'GET' as Method,
//     url: `${msgGtwUrl}/${specId}/lastEmail/${email}`,
//   };
//   const { data: response } = await axios.request(emailOptions);
//   return response;
// }
//
// async function signUpUserUsingEmail(
//   iCureUrl: string,
//   msgGtwUrl: string,
//   msgGtwSpecId: string,
//   authProcessId: string,
//   hcpId: string
// ): Promise<{ api: MedTechApi; user: User }> {
//   console.log('Crypto', crypto);
//   console.log('url', iCureUrl);
//   const anonymousMedTechApi = await new AnonymousMedTechApiBuilder()
//     .withICureBaseUrl(iCureUrl)
//     .withMsgGwUrl(msgGtwUrl)
//     .withMsgGwSpecId(msgGtwSpecId)
//     .withCrypto(crypto as Crypto)
//     .withAuthProcessByEmailId(authProcessId)
//     .withAuthProcessBySmsId(authProcessId)
//     .build();
//
//   const email = await getTempEmail();
//   const process =
//     await anonymousMedTechApi.authenticationApi.startAuthentication(
//       'a58afe0e-02dc-431b-8155-0351140099e4',
//       email,
//       undefined,
//       'Antoine',
//       'Duchâteau',
//       hcpId,
//       false
//     );
//
//   console.log('process', process);
//
//   const emails = await getEmail(email);
//
//   const subjectCode = emails.subject!;
//   const result =
//     await anonymousMedTechApi.authenticationApi.completeAuthentication(
//       process!,
//       subjectCode,
//       () => anonymousMedTechApi.generateRSAKeypair()
//     );
//
//   console.log('result', result);
//
//   if (result?.medTechApi == undefined) {
//     throw Error(`Couldn't sign up user by email for current test`);
//   }
//
//   const foundUser = await result.medTechApi.userApi.getLoggedUser();
//   await result.medTechApi.cryptoApi.loadKeyPairsAsTextInBrowserLocalStorage(
//     foundUser.healthcarePartyId ?? foundUser.patientId ?? foundUser.deviceId!,
//     hex2ua(result.keyPair.privateKey)
//   );
//
//   return { api: result.medTechApi, user: foundUser };
// }
//
// const {
//   iCureUrl: iCureUrl,
//   msgGtwUrl: msgGtwUrl,
//   authProcessHcpId: authProcessHcpId,
//   specId: specId,
// } = getEnvVariables();
//
// const patAuthProcessId =
//   ICURE_TS_TEST_PAT_AUTH_PROCESS_ID ?? '6a355458dbfa392cb5624403190c39e5';
//
// const test = async () => {
//   return await signUpUserUsingEmail(
//     iCureUrl,
//     msgGtwUrl,
//     specId,
//     patAuthProcessId,
//     authProcessHcpId
//   );
// };
//
// describe('Medical sdk test', function () {
//   it('should sign up user by email', async () => {
//     test()
//       .then((result) => {
//         console.log('Api', JSON.stringify(result.api));
//         console.log('User', JSON.stringify(result.user));
//       })
//       .catch((e) => console.error('Error', JSON.stringify(e)));
//   });
// });
