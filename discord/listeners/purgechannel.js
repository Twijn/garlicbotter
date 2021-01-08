let client = null;

const purgeChannel = id => {
    con.query("update channels set side = null where side = ?;", [id], err => {if (err) console.error(err);});
    con.query("update channels set parent = null where parent = ?;", [id], err => {if (err) console.error(err);});

    con.query("delete from channels where id = ?;", [id], err => {if (err) console.error(err);});
}

module.exports = clt => {
    client = clt;

    client.on("channelDelete", channel => {
        purgeChannel(channel.id);
    });
}