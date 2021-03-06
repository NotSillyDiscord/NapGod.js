const { RichEmbed, Permissions } = require('discord.js');
const config = require('../../config.json');
const { findRole } = require('./find');
const { cutAt, executeFunction, toReadableString } = require('./utility');

const commandName = 'roleinfo';
function processRoleInfo(command, message, args, dry = false) {
  if (command === commandName) {
    if (args.length === 0) {
      let msg =
        'You need to provide at least one argument to retrieve the role.';
      console.log('INFO:  ', msg);
      if (!dry) {
        message.channel.send(msg);
      }
    } else {
      executeFunction(roleInfo, message, args, dry);
    }
    return true;
  }
  return false;
}

function buildPermissionsRoles(role) {
  let perms;
  if (role === role.guild.defaultRole) {
    perms = new Permissions(role.guild.defaultRole.permissions)
      .toArray()
      .map((p) => toReadableString(p));
  } else {
    const permsEveryone = new Permissions(role.guild.defaultRole.permissions);
    perms = new Permissions(role.permissions)
      .toArray()
      .filter((p) => !permsEveryone.has(p))
      .map((p) => toReadableString(p));
  }
  return cutAt(perms.join(', '), 1500, ',');
}

function buildEmbedRole(role) {
  let embed = new RichEmbed();
  embed.setTitle(role.name);
  embed.setColor(role.color);
  embed.setFooter(`ID: ${role.id}`);
  embed.setTimestamp();
  embed.setDescription(role);

  embed.addField('Mentionable', role.mentionable, true);
  embed.addField('Managed', role.managed, true);
  embed.addField('Hoist', role.hoist, true);
  embed.addField(
    'Position',
    `${role.position}/${role.guild.roles.size - 1}`,
    true
  );
  embed.addField('Creation Date', role.createdAt.toUTCString(), true);
  embed.addField('Members Count', role.members.size, true);
  const perms = buildPermissionsRoles(role);
  if (perms.length > 0) {
    embed.addField('Permissions', perms);
  }
  return embed;
}

async function roleInfo(message, args, dry) {
  const roleIdentifier = message.content
    .replace(config.prefix + commandName, '')
    .trim();
  console.log('INFO:  roleIdentifier: ', roleIdentifier);
  let role = await findRole(
    roleIdentifier,
    message.guild,
    message.mentions.roles
  );
  if (!role.found) {
    console.log(role.msg);
    if (!dry) {
      await message.channel.send(role.msg);
    }
  } else {
    role = role.value;
    console.log(`INFO:  role found ${role.name} -> ${role.id}`);
    if (!dry) {
      const embed = buildEmbedRole(role);
      await message.channel.send(embed);
    }
  }
}

module.exports = {
  processRoleInfo,
};
