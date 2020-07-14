const request = require('request-promise');

const CONF = require('../config');

function makeRequest({ method, url, qs }) {
  return new Promise((resolve, reject) => {
    request({
      method,
      url,
      headers: {
        Authorization: CONF.DimiAuth,
      },
      qs,
      json: true,
    })
      .then(data => {
        resolve(data);
      })
      .catch(err => {
        console.log(err);
        resolve(null);
      });
  });
}

exports.identify = (username, password) => {
  return makeRequest({
    method: 'GET',
    url: 'https://api.dimigo.hs.kr/v1/users/identify',
    qs: {
      username,
      password,
    },
  });
};

exports.getStudent = (username) => {
  return makeRequest({
    method: 'GET',
    url: `https://api.dimigo.hs.kr/v1/user-students/${username}`,
  });
};

// export function getGraduate(userId: number): Promise<DimiGraduate | null> {
//   return makeRequest({
//     method: 'GET',
//     url: `https://api.dimigo.hs.kr/v1/user-gcn-histories/${userId}`,
//   });
// }

// export function getTeacher(username: string): Promise<DimiTeacher | null> {
//   return makeRequest({
//     method: 'GET',
//     url: `https://api.dimigo.hs.kr/v1/user-teachers/${username}`,
//   });
// }

// export function getParents(userId: number): Promise<DimiParent[]> {
//   return makeRequest({
//     method: 'GET',
//     url: `https://api.dimigo.hs.kr/v1/user-parents/search?parent_id=${userId}`,
//   });
// }

// interface MakeRequest {
//   method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTION',
//   url: string,
//   qs?: any,
// };

// type DimiUserType =
//   'T' | 'D' | 'S' |
//   'P' | 'O';

// interface DimiIdentify {
//   id: number;
//   username: string;
//   email: string;
//   name: string;
//   nick: string;
//   gender: string;
//   user_type: DimiUserType;
//   birthdate: Date | null;
//   phone: string;
//   status: number;
//   photofile1: string;
//   photofile2: string | null;
//   created_at: Date;
//   updated_at: Date;
//   password_hash: string | null;
//   sso_token: string;
// };

// interface DimiStudent {
//   user_id: number;
//   username: string;
//   name: string;
//   gender: string;
//   phone: string;
//   grade: number;
//   class: number;
//   number: number;
//   serial: string,
//   rfcard_uid: string;
//   photofile1: string;
//   photofile2: string | null;
//   dormitory: string;
//   library_id: string;
// };

// interface DimiGraduate {
//   user_id: number,
//   year1: number,
//   class1: number,
//   number1: number,
//   year2: number,
//   class2: number,
//   number2: number,
//   year3: number,
//   class3: number,
//   number3: number,
// };

// interface DimiTeacher {
//   user_id: string,
//   username: string,
//   name: string,
//   gender: string,
//   position_name: string,
//   role_name: string,
//   grade: number,
//   class: number,
// };

// interface DimiParent {
//   parent_id: number,
//   parent_username: string,
//   parent_name: string,
//   phone: string,
//   relation: string,
//   child_id: number,
//   child_username: string,
//   child_name: string,
//   serial: string
// };
